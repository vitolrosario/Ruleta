var SocialNetworksMixin = {
    created: function () {
        // console.log('created SocialNetworksMixin');
        this.tiktokAddUrl();
    },
    data: {
        form: {
            url: '',
            urls: [],
        },
        loading: false,
        video_info: null,
        url_media_info: {},
    },
    methods: {
        // TikTok Methods

        tiktokOnSubmit: function () {
            if (this.loading) {
                return false;
            }

            if (this.tiktokValidate()) {
                this.tiktokGetVideoInfo();
            }
        },

        tiktokValidate: function () {
            var urls = this.form.urls;
            var _this = this;
            var uniques = [];
            var isValid = true;

            this.form.urls.forEach(function (input) {
                var valid = _this.tiktokParseUrl(input.url);

                if (valid) {
                    if (uniques.indexOf(valid) > -1) {
                        input.error = true;
                        isValid = false;
                    } else {
                        input.url = valid;
                        uniques.push(valid);
                        input.error = false;
                    }
                } else {
                    input.error = true;
                    isValid = false;
                }
            });
            return isValid;
        },

        tiktokParseUrl: function (url) {
            if (url.indexOf('https://') === -1 && url.indexOf('http://') === -1 ) {
                url = 'https://' + url;
            }

            if (url.indexOf('#/@') > -1) {
                url = 'https://www.tiktok.com/@' + url.split('#/@')[1];
            }

            if (url.indexOf('/photo/') !== -1) {
                url = url.replace('/photo/', '/video/');
            }

            var url_info = new URLParser(url);

            if (url_info.host.indexOf('vm.tiktok.com') > -1) {
                return 'https://vm.tiktok.com' + url_info.pathname;
            }

            if (url_info.host.indexOf('tiktok.com') === -1) {
                return false;
            }

            if (url_info.pathname.indexOf('/t/') !== -1) {
                return 'https://www.tiktok.com' + url_info.pathname;
            }

            if (url_info.pathname.indexOf('@') === -1 || (url_info.pathname.indexOf('/video/') === -1 && url_info.pathname.indexOf('/photo/') === -1)) {
                return false;
            }

            return 'https://www.tiktok.com' + url_info.pathname;
        },

        tiktokGetVideoInfo: function () {
            var url = this.form.urls[0].url;

            if (this.url_media_info[url]) {
                this.video_info = this.url_media_info[url];
                return (true, this.toast(this.$t('validations.post_already_added'), 'error'));
            }

            var _this = this;

            this.loading = true;

            $.ajax({
                url: '/api/tiktok/info',
                type: 'GET',
                dataType: 'json',
                data: {
                    url: btoa(url),
                },
                success: this.__tiktokParseVideoInfoResponse,
                error: this.tiktokOnVideoInfoError,
                complete: function () {
                    _this.loading = false;
                    _this.form.urls[0] = {
                        url: '',
                        error: false,
                        message: '',
                        info: {},
                    }
                }
            });
        },

        __tiktokParseVideoInfoResponse: function (html) {
            if (typeof html === 'object') {
                if (html.data) {

                    if (html.data.comments_count < 2) {
                        this.loading = false;
                        this.showAlert('Error', this.$t('validations.tiktok_no_comments'));
                        return false;
                    }

                    this.url_media_info[html.data.url] = html.data;
                    this.video_info = html.data;
                    this.onAddPost('tiktok', html.data.owner, html.data);
                    return;
                } else {
                    return this.tiktokOnVideoInfoError(true);
                }
            }

            if (html.indexOf('__NEXT_DATA__') > -1) {
                return this.tiktokParseVideoInfoResponse(html);
            }

            if (html.indexOf('SIGI_STATE') > -1 && html.indexOf('SIGI_RETRY') > -1) {
                return this.tiktokParseVideoInfoResponseNew(html);
            }

            return this.tiktokOnVideoInfoError(true);
        },

        tiktokOnVideoInfoError: function (e) {
            this.loading = false;
            this.showAlert('Error', this.$t('validations.tiktok_video_info_error'));
        },

        tiktokAddUrl: function (url) {
            this.form.urls.push({
                url: url || '',
                error: false,
                message: '',
                info: {},
            });

            this.initTooltips();
        },
        initTooltips: function () {
            setTimeout(function() {
                $('[data-toggle="tooltip"]').tooltip();
            }, 500);
        },

        tiktokParseVideoInfoResponse: function (html) {
            const regex = /<script id="__NEXT_DATA__".*?>(.+?)<\/script>/gi;
            var r = regex.exec(html);
            var json = JSON.parse(r[1]);

            if (json.props && json.props.pageProps && json.props.pageProps.itemInfo && json.props.pageProps.itemInfo.itemStruct) {
                var info = this.tiktokExtractVideoInfoFromJSON(json.props.pageProps.itemInfo.itemStruct);

                if (info.comments_disabled) {
                    this.loading = false;
                    this.showAlert('Error', this.$t('validations.tiktok_comments_disabled'));
                    return false;
                }

                if (info.comments_count === 0) {
                    this.loading = false;
                    this.showAlert('Error', this.$t('validations.tiktok_no_comments'));
                    return false;
                }

                this.is_logged_out = (json.props.initialProps.$user) ? false : true;

                if (this.is_logged_out) {
                    return this.tiktokOnLoggedOutError();
                }

                this.url_media_info[info.url] = info;
                this.tiktokValidateFormAPI(info);
            } else {
                this.tiktokOnVideoInfoError(true);
            }
        },

        tiktokParseVideoInfoResponseNew: function (html) {
            if (html.indexOf("window['SIGI_STATE']") > -1) {
                var json = JSON.parse(html.split("window['SIGI_STATE']=")[1].split(";window['SIGI_RETRY']")[0]);
            }

            if (html.indexOf('<script id="SIGI_STATE"') > -1) {
                var json = JSON.parse(html.split('<script id="SIGI_STATE" type="application/json">')[1].split('</script><script id="SIGI_RETRY"')[0]);
            }

            var video_id = Object.keys(json.ItemModule)[0];
            var video_info = json.ItemModule[video_id];
            var info = this.tiktokExtractVideoInfoFromJSON(video_info);

            if (info.comments_disabled) {
                this.loading = false;
                this.showAlert('Error', this.$t('validations.tiktok_comments_disabled'));
                return false;
            }

            if (info.comments_count === 0) {
                this.loading = false;
                this.showAlert('Error', this.$t('validations.tiktok_no_comments'));
                return false;
            }

            this.is_logged_out = (json && json.AppContext && json.AppContext.appContext && json.AppContext.appContext.$user) ? false : true;

            if (this.is_logged_out) {
                return this.tiktokOnLoggedOutError();
            }

            this.url_media_info[info.url] = info;
            this.tiktokValidateFormAPI(info);
        },

        tiktokExtractVideoInfoFromJSON: function (data) {
            var author_id = (data.author && data.author.id) ? data.author.id : data.authorId;
            var author_username = (data.author && data.author.uniqueId) ? data.author.uniqueId : data.author;
            var author_avatar = (data.author && data.author.avatarLarger) ? data.author.avatarLarger : '';

            return {
                'media_id': data.id,
                'title': data.desc,
                'url': this.form.urls[0].url,
                'comments_count': data.stats.commentCount,
                'comments_disabled': (data.itemCommentStatus === 3),
                'thumb': data.video.cover,
                'owner': {
                    'id': author_id,
                    'username': author_username,
                    'avatar': author_avatar
                }
            }
        },

        tiktokValidateFormAPI: function (media_info) {
            var _this = this;
            var urls = this.form.urls.map(function(input) { return input.url; });
            var data = { 'url': this.form.urls[0].url };

            _this.loading = true;

            $.ajax({
                url: '/api/tiktok/validate?url=' + this.form.urls[0].url,
                type: 'POST',
                dataType: 'json',
                data: { info: media_info },
                success: function(response) {

                    if (response && response.error) {
                        var error_msg = 'We couldn\'t recognize the pasted link. Please check the URL looks like this <br><br> <a href="#">https://www.tiktok.com/@user/video/6977982...</a>';
                        _this.showAlert('The URL is invalid', error_msg);
                    }

                    if (response.data && response.success) {
                        if (response.data.payment || !response.data.upgrade) {
                            $.redirectPost('/' + locale + '/app', {
                                url: _this.form.urls[0].url,
                                type: 'tiktok'
                            });
                            return;
                        }

                        if (response.data && response.data.media) {
                            _this.selected_media = response.data.media;
                        }

                        if (response.data && response.data.media && response.data.upgrade) {
                            // _this.upgrade = response.data.upgrade;
                            // mixpanel.track("AS_ShowedUpgradeTiktok");
                            // $('#upgradeModalTiktok').modal({backdrop: 'static', keyboard: false});
                            _this.showSubscriptionUpgradeModal(response.data.media.comments_count, 'tiktok');
                            _this.redirecting = false;
                        }
                    }

                    _this.loading = false;
                },
                error: function (response) {
                    _this.loading = false;
                }
            });
        },

        tiktokOnLoggedOutError: function (e) {
            this.loading = false;
            this.extension.connected = false;
            // this.showAlert(
            //     'Error',
            //     this.$t('validations.tiktok_login_error'),
            //     this.$t('validations.tiktok_login_error_cta'),
            //     'https://www.tiktok.com/login'
            // );

            this.tiktokShowExtensionSetupModal();

            mixpanel.track("AS_ShowedTiktokLoginError");
        },

        tiktokShowExtensionSetupModal: function () {
			this.loading = false;
			this.openModal('js-chrome-extension-modal');
        },

        tiktokGetComments: function (post, page) {
            var _this = this;
            var page = page || 1;

            $.ajax({
                dataType: "json",
                type: 'GET',
                url: "/api/tiktok/comments",
                headers: {
                    'x-csrf-app': 'multinetwork'
                },
                data: {
                    id: post.data.media_id,
                    page: page
                },
                success: function (result) {
                    if (result.data && result.data.items && result.data.items.length) {
                        _this.tiktokParseApiResponse(result, post, page);
                    } else {
                        if (result.data && result.data.error) {
                            // mixpanel.track("AS_TiktokError", {url: this.url });
                            _this.trackError('Tiktok error empty: ' + this.url);
                            if (_this.fetchErrorCount > 3) {
                                post.ready = true;
                                _this.loadNextPostComments();
                                return false;
                            }

                            setTimeout(() => {
                                _this.tiktokGetComments(post, page)
                            }, 5000);

                            _this.fetchErrorCount++;
                        }
                    }
                },
                error: function (result) {
                    // mixpanel.track("AS_TiktokError", {url: this.url });
                    _this.trackError('Tiktok error: ' + this.url);

                    if (_this.fetchErrorCount > 3) {
                        post.ready = true;
                        _this.loadNextPostComments();
                        return false;
                    }

                    setTimeout(_this.tiktokGetComments, 7000);

                    _this.fetchErrorCount++;
                }
            });
        },

        tiktokParseApiResponse: function (response, post, page) {
            if (response.data.items && response.data.items.length) {
                let items = response.data.items;
                let tiktokComments = [];

                items.length && items.forEach((item) => {
                    item.type = 'tiktok'
                    tiktokComments.push(item)
                })

                // var comments = this.transformTiktokComments(response.data.items);
                post.comments = post.comments.concat(tiktokComments);
                this.updateLoadingTotals(tiktokComments.length);
            }

            var m = 3000;
            let params = {
                c: (post.comments>m) ? m : post.data.comments_count,
                s: (post.comments>m) ? 4000 : 3000,
            }

            if (response.data.has_more && post.comments.length < params.c) {
                page++;
                this.fetchErrorCount = 0;

                setTimeout(() => {
                    this.tiktokGetComments(post, page)
                }, params.s);
            } else {
                post.ready = true;
                this.loadNextPostComments();
            }
        },

        // Facebook Methods

        loginWithFacebook: function () {

        },

        //  Twitter Methods

        isValidTwitterUrl: function (url) {
            var valid = this.parseTwitterUrl(url);
            if (valid) {
                return true;
            }
            return false;
        },

        parseTwitterUrl: function (string) {

            if (string.indexOf('x.com') > -1) {
                string = string.replace('x.com', 'twitter.com');
            }

            string = string.replace(/\?.*/i, '');
            var regex = /^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)$/;
            var r = regex.exec(string);

            // console.log(r);
            var url_info = new URLParser(string);
            // console.log(url_info);

            if (r && r.length && r.length === 4) {
                return string;
            }

            return false;
        },

        getTweetIdFromUrl: function (url) {
            var parts = url.split('/status/');
            return parts[1];
        },

        getTweetMediaInfo: function (tweet_id, callback) {
            var _this = this;
            var data = {
                'id': tweet_id,
                'url': _this.form.twitter_url
            };

            $.ajax({
                url: '/api/twitter/media',
                type: 'GET',
                dataType: 'json',
                data: data,
                success: function (response) {

                    // console.log(response);
                    if (response.success) {
                        callback && response.success && response.data && callback(response.data);
                    } else if (response.error === 'ERROR_NO_POST_OWNER') {
                        let error_body = _this.$t('validations.twitter_no_post_owner');
                        _this.showAlert('Oops!', error_body);
                    }

                    // if (response && response.error) {
                    //     this.showInvalidLinkError();
                    // }

                    // if (response.data && response.success) {
                    //     if (response.data.payment || !response.data.upgrade) {
                    //         $.redirectPost('/' + locale + '/app', {
                    //             type: 'twitter',
                    //             url: _this.url,
                    //         });
                    //         return;
                    //     }

                    //     if (response.data && response.data.media) {
                    //         _this.selected_media = response.data.media;
                    //     }

                    //     if (response.data && response.data.media && response.data.upgrade) {
                    //         _this.upgrade = response.data.upgrade;
                    //         _this.upgrade.comments_limit = window.free_limit_twitter_rt;
                    //         mixpanel.track("AS_ShowedUpgradeTwitter");
                    //         $('#js-upgrade-modal').modal({ backdrop: 'static', keyboard: false });
                    //         _this.loading = false;
                    //     }
                    // }

                    // _this.loading = false;
                }
            });
        },

        onTwitterLogout: function () {
            var _this = this;
            $.post({
                url: '/api/twitter/logout',
                dataType: 'json',
                success: function (response) {
                    if (typeof _this.twitter_session !== 'undefined') {
                        _this.twitter_session = false;
                    }
                }
            });

        }
    }
};
