var app = new Vue({
    el: '#fbapp',
    mixins: [CommonMixin, UpgradeMixin],
    i18n: Vue_I18N,
    data: {
        fbInit: false,
        init: false,
        auth: false,
        selectedPage: null,
        selectedPost: null,
        fb_user: null,
        accounts: [],
        posts: [],
        posts_order: 'date',
        comments: [],
        loadingPosts: false,
        redirecting: false,
        accountsFetched: false,
        mediaPagination: {},
        upgrade: {},
        facebook_url: '',
        access_token: window.facebook_login_access_token,
    },
    computed: {
        posts_ordered: function () {
            let order = this.posts_order;

            if (order === 'date') {
                return this.posts.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
            } else {
                return this.posts.sort((a, b) => b.comments_count - a.comments_count);
            }
        }
    },
    created: function() {
        var _this = this;

        this.onInitFacebookSDK(false);
        window.fbAsyncInit = function() {
            _this.onInitFacebookSDK(true);
        }
    },
    methods: {
        onInitFacebookSDK: function (asyc) {
            var _this = this;

            if (!facebook_login_access_token) {
                return false;
            }

            if (this.fbInit || !window.FB) {
                return false;
            }

            this.fbInit = true;
            console.log('onInitFacebookSDK asyc?', asyc);


            FB.init({
                appId: window.fb_app_id,
                version: window.fb_app_version,
                cookie: true,
                xfbml: true,
            });

            // if (window.facebook_login_access_token) {
            //     FB.setAccessToken = window.facebook_login_access_token;
            // }

            FB.AppEvents.logPageView();

            this.accounts = [];
            this.fetchFbUser();
            this.fetchAccounts();

            // FB.getLoginStatus(function(response) {
            //     _this.onInstagramStatusChange(response);
            // }, {access_token: facebook_login_access_token});

            // FB.Event.subscribe('auth.login', function(response) {
            //    _this.onInstagramStatusChange(response);
            // });

            // FB.Event.subscribe('auth.logout', function(response) {
            //    _this.onInstagramStatusChange(response);
            // });
        },

        onFacebookStatusChange: function(e) {
            this.init=true;

            console.log(e);

            switch (e.status) {
                case 'connected':
                    this.auth = e.authResponse;
                    mixpanel.track("AS_FacebookConnected");
                    this.fetchAccounts();
                    break;

                case 'not_authorized':
                case 'authorization_expired':
                case 'unknown':
                    this.logout();
                    break;
            }
        },

        logout: function (clear_global_token) {
            this.auth = null;
            this.pages = null;
            this.selectedPage = null;
            this.selectedPost = null;
            this.posts = [];
            this.accounts = [];
            this.comments = [];
            this.fb_user = null;
            this.fbInit = false;
            this.access_token = null;
            this.accountsFetched = false;

            if (clear_global_token) {
                window.facebook_login_access_token = '';
            }
        },

        fetchFbUser: function () {
            var _this = this;
            FB.api("/me?fields=id,name,picture", {access_token: this.access_token}, function (r) {
                if (r.error && r.error.message.indexOf('access token') !== -1) {
                    window.location.href = '/auth/facebook/reset-session';
                    return false;
                }
                _this.fb_user = r;
            });
        },

        fetchAccounts: function (uri) {
            if (uri) {
                FB.api(uri, this.onFacebookGetAccounts);
            } else {
                FB.api("/me/accounts?fields=id,name,username,access_token,picture,verification_status&limit=30", {access_token: this.access_token}, this.onFacebookGetAccounts);
            }
        },

        onFacebookGetAccounts: function(r) {
            var _this = this;

            this.accountsFetched = true;

            if (r.data && r.data.length) {
                this.accounts = this.accounts.concat(r.data).sort(function(a, b){
                    if(a.name < b.name) { return -1; }
                    if(a.name > b.name) { return 1; }
                    return 0;
                });
                mixpanel.track("AS_FacebookAccountsLoaded", {count: r.data.length});
            } else {
                if (r.error) {
                    mixpanel.track("AS_FacebookAccountsLoadedError", {
                        message: r.error.message,
                        error_user_title: r.error.error_user_title,
                        error_user_msg: r.error.error_user_msg,
                    });

                    if (r.error.message.indexOf('access token') !== -1) {
                        window.location.href = '/auth/facebook/reset-session';
                    }
                } else {
                    mixpanel.track("AS_FacebookAccountsLoadedError", {data: r });
                }
            }

            if (r.paging.next) {
                _this.fetchAccounts(r.paging.next);
            }
        },
        resetPosts: function () {
            this.posts = [];
            this.selectedPage = null;
            this.selectedPost = null;
        },
        onPageSelected: function (index) {
            mixpanel.track("AS_FacebookPageSelected");
            this.fetchPosts(index);
            this.fetchReels(index);
        },
        onFacebookLogin: function (force_login) {
            // FB.login(this.onFacebookStatusChange, {
            //     scope: "pages_read_engagement,pages_read_user_content,instagram_basic",
            //     return_scopes: !0
            // });
            var return_url = "/auth/facebook?locale=" + locale + "&return_url=" + window.location.pathname;
            if (window.facebook_login_access_token && !force_login) {
                this.access_token = window.facebook_login_access_token;
                this.onInitFacebookSDK();
            } else {
                window.location.href = return_url;
            }
        },
        onFacebookLogout: function () {
            this.logout(true);
            // FB.api("/me/permissions", "delete", function(e) {
            //     if (e.success === true) {
            //         _this.logout();
            //     }
            // })
        },

        onConnectMoreAccounts: function () {
            this.openModal('fbReconnectAccount');
        },

        onPostSelected: function (post) {
            this.selectedPost = post;
            window.scrollTo(0,0);
            // if (post.comments && post.comments.summary && post.comments.summary.total_count > 1) {
                // $('#startModal').modal();
                // mixpanel.track("AS_FacebookPostSelected");
                // setTimeout(function () {
                //     $('#post_id').val(post.id);
                //     $('#token').val(_this.selectedPage.access_token);
                //     $('#comments_count').val(post.comments.summary.total_count);
                //     $('#author_name').val(_this.selectedPage.name);
                //     $('#author_id').val(_this.selectedPage.id);
                //     if (post.full_picture) {
                //         $('#picture').val(post.full_picture);
                //     }
                // }, 1000);

                // this.fetchComments(post);
            // } else {
            //     $('#exampleModalCentered').modal();
            // }
        },
        changePostsOrder: function (order) {
            this.posts_order = order
        },
        fetchPosts: function(e) {
            var _this = this;
            var index = (e.target) ? e.target.value : e;
            var Page = this.accounts[index];
            this.selectedPage = Page;
            this.lodingPosts = true;

            var url = Page.id + "/posts?fields=id,message,full_picture,created_time,comments.limit(0).summary(true),likes.limit(0).summary(true),attachments&limit=18&access_token=" + Page.access_token;
            // var url = Page.id + "/posts?fields=id,message,full_picture&limit=30&access_token=" + Page.access_token;

            this._callFetchPosts(url);
        },

        fetchReels: function(e, next_url) {
            var _this = this;
            if (e !== null) {
                var index = (e.target) ? e.target.value : e;
                var Page = this.accounts[index];
                var url = Page.id + "/video_reels?fields=id,message,thumbnails,picture,created_time,comments.limit(0).summary(true),likes.limit(0).summary(true)&limit=18&access_token=" + Page.access_token;
                this.loadingPosts = true;
            } else {
                url = next_url;
            }

            FB.api(url, function(r) {
                if (r.data && r.data.length) {
                    var new_posts = r.data.map(function (item) {
                        item.full_picture = item.picture;
                        item.comments_count = (item.comments && item.comments.summary && item.comments.summary.total_count) ? item.comments.summary.total_count : 0;
                        item.likes_count = (item.likes && item.likes.summary && item.likes.summary.total_count) ? item.likes.summary.total_count : 0;
                        item.media_type = 'reel';
                        if (!item.full_picture && item.comments_count > 0) {
                            item.full_picture = '/img/pic_placeholder_1.jpg';
                        }

                        return item;
                    });
                    _this.posts = _this.posts.concat(new_posts)
                    .filter(function(post) {
                      return (post.full_picture) || false;
                    });

                    if (r.paging && r.paging.next) {
                        if (_this.posts.length < 60) {
                            _this.fetchReels(null, r.paging.next)
                        } else {
                            _this.loadingPosts = false;
                        }
                    } else {
                        _this.loadingPosts = false;
                    }

                }
            });
        },

        _callFetchPosts: function (url) {
            var _this = this;

            this.loadingPosts = true;

            FB.api(url, function(r) {
                if (r.data && r.data.length) {
                    // mixpanel.track("AS_FacebookPostsLoaded", {data: r});
                    var new_posts = r.data.map(function (item) {
                        if (item.attachments && item.attachments.data && item.attachments.data[0] && item.attachments.data[0].media && item.attachments.data[0].media.image) {
                            item.full_picture = item.attachments.data[0].media.image.src;
                        }

                        item.comments_count = (item.comments && item.comments.summary && item.comments.summary.total_count) ? item.comments.summary.total_count : 0;
                        item.likes_count = (item.likes && item.likes.summary && item.likes.summary.total_count) ? item.likes.summary.total_count : 0;

                        if (!item.full_picture && item.comments_count > 0) {
                            item.full_picture = '/img/pic_placeholder_1.jpg';
                        }

                        item.media_type = 'photo';

                        return item;
                    });
                    _this.posts = _this.posts.concat(new_posts)
                    .filter(function(post) {
                      return (post.full_picture) || false;
                    });

                    if (r.paging && r.paging.next) {
                        if (_this.posts.length < 10) {
                            _this._callFetchPosts(r.paging.next)
                        } else {
                            _this.mediaPagination = r.paging;
                            _this.loadingPosts = false;
                        }
                    } else {
                        _this.loadingPosts = false;
                        _this.mediaPagination = {};
                    }

                } else {
                    if (r.error) {
                        mixpanel.track("AS_FacebookPostsLoadedError", {
                            message: r.error.message,
                            error_user_title: r.error.error_user_title,
                            error_user_msg: r.error.error_user_msg,
                        });
                    } else {
                        mixpanel.track("AS_FacebookPostsLoadedError", {data: r });
                    }
                    _this.loadingPosts = false;
                }

            });
        },

        onFetchNextPage: function () {
            this._callFetchPosts(this.mediaPagination.next);
        },

        fetchComments: function(post) {
            var _this = this;
            var url = post.id + "/comments?fields=total_count,from,message,permalink_url&limit=" + 500 + "&access_token=" + this.selectedPage.access_token;

            FB.api(url, function(r) {
                if (r.data && r.data.length) {
                    _this.comments = r.data;
                }
            });
        },

        validate: function () {
            var _this = this;

            if (this.selectedPost.comments.summary.total_count < 2) {
                this.redirecting = true;
                setTimeout(function () {
                    showErrorModal('no_comments');
                    _this.redirecting = false;
                }, 1100);
                return;
            }

            return this.validateAPI();

            $.ajax({
                method: "GET",
                dataType: "json",
                url: '/api/facebook/validate',
                data: {
                    page_id: this.selectedPage.id,
                    post_id: this.selectedPost.id,
                },
                success: function (r) {
                    // window.location.href = '/dashboard?deleted=1';
                },
                error: function(jqXhr, textStatus, errorMessage) {

                }
            });


            this.redirecting = true;
            setTimeout(function () {
                $.redirectPost('/' + locale + '/app', {
                    type: 'facebook',
                    url: 'https://fb.com/' + _this.selectedPost.id,
                    media_id: _this.selectedPost.id,
                    access_token: _this.selectedPage.access_token,
                    comments_count: _this.selectedPost.comments.summary.total_count,
                    thumb: _this.selectedPost.full_picture,
                    author_name: _this.selectedPage.name,
                    author_id: _this.selectedPage.id
                });
            }, 1000);
            // window.location.href = '/app';
        },

        validateAPI: function () {
            var _this = this;
            this.redirecting = true;

            $.ajax({
                method: "GET",
                dataType: "json",
                url: '/api/facebook/validate',
                data: {
                    page_id: this.selectedPage.id,
                    post_id: this.selectedPost.id,
                    media_type: this.selectedPost.media_type,
                    page_access_token: this.selectedPage.access_token
                },
                success: function (r) {
                    if(r.success === false){
                        window.location.reload();
                    }

                    if (r.data && r.data.upgrade) {
                        _this.showSubscriptionUpgradeModal(r.data.media.comments_count, 'facebook');
                        _this.redirecting = false;
                        return false;
                    }

                    if (r.data && !r.data.upgrade) {
                        $.redirectPost('/' + locale + '/app', {
                            type: 'facebook',
                            url: 'https://fb.com/' + _this.selectedPost.id,
                            media_id: _this.selectedPost.id,
                            access_token: _this.selectedPage.access_token,
                            comments_count: _this.selectedPost.comments.summary.total_count,
                            thumb: _this.selectedPost.full_picture,
                            author_name: _this.selectedPage.name,
                            author_id: _this.selectedPage.id
                        });

                        return false;
                    }

                    _this.redirecting = false;
                },
                error: function(jqXhr, textStatus, errorMessage) {
                    _this.redirecting = false;
                }
            });

            // setTimeout(function () {
            //     $.redirectPost('/' + locale + '/app', {
            //         type: 'facebook',
            //         url: 'https://fb.com/' + _this.selectedPost.id,
            //         media_id: _this.selectedPost.id,
            //         access_token: _this.selectedPage.access_token,
            //         comments_count: _this.selectedPost.comments.summary.total_count,
            //         thumb: _this.selectedPost.full_picture,
            //         author_name: _this.selectedPage.name,
            //         author_id: _this.selectedPage.id
            //     });
            // }, 1000);
            // window.location.href = '/app';
        },

        onValidateURL: function () {
            var post_id = this.getPostIDFromURL(this.facebook_url);

            if (!post_id) {
                this.showInvalidLinkError();
                return false;
            }

            var media_id = this.selectedPage.id + '_' + post_id;

            this.getPostInfo(media_id);
        },

        getPostIDFromURL: function(e) {
            var n = ""
              , t = e.match(/[^](fbid=[0-9]{9})\d+/);
            if (null !== t)
                n = (n = t[0].replace("?fbid=", "")).replace("_fbid=", "");
            else {
                var s = e.match(/[^\/|\.!=][0-9]{7,}(?!.*[0-9]{7,})\d+/);
                null !== s && (n = s[0])
            }
            return n
        },

        getPostInfo: function (media_id) {
            var uri = media_id + "/?fields=id,message,full_picture,comments.summary(true)&access_token=" + this.selectedPage.access_token;
            FB.api(uri, this.handlePostInfoResponse);
        },

        handlePostInfoResponse: function (response) {
            if (response && response.id) {
                this.onPostSelected(response);
                return true;
            }

            if (response && response.error) {
                this.showInvalidTokenError();
                return true;
            }

            this.showInvalidLinkError();
        },

        showInvalidLinkError() {
            var error_body = this.$t('validations.invalid_url_body');
            error_body += '<br><br> <a href="#">facebook.com/' + this.selectedPage.username + '/posts/261480...</a>';
            this.showAlert(this.$t('validations.invalid_url_title'), error_body);
        },

        showInvalidTokenError() {
            var error_body = this.$t('validations.invalid_url_fb');
            error_body += '<br><br> <a href="#">' + this.selectedPage.name +'</a>';
            this.showAlert(this.$t('validations.invalid_url_title'), error_body);
        },

        onReAutorizeFacebookLogin: function () {
            var _this = this;
            _this.redirecting = true;
            $.post('/api/facebook/re-autorize')
                .then(function () {
                    FB.api("/me/permissions", 'delete', {access_token: _this.access_token});
                    _this.logout(true);
                    setTimeout(_this.onFacebookLogin, 2000);
                });
        },

        setToken: function (tok) {
            window.facebook_login_access_token = tok;
            this.fbInit = false;
            this.onFacebookLogin();
        }
    }
});