(function () {
    // globals
    var canvas;
    var ctx;
    var W;
    var H;
    var mp = 50; //max particles
    var particles = [];
    var angle = 0;
    var tiltAngle = 0;
    var confettiActive = true;
    var animationComplete = true;
    var preventReposition = false;
    var deactivationTimerHandler;
    var reactivationTimerHandler;
    var animationHandler;

    // objects

    var particleColors = {
        colorOptions: ["DodgerBlue", "OliveDrab", "Gold", "pink", "SlateBlue", "lightblue", "Violet", "PaleGreen", "SteelBlue", "SandyBrown", "Chocolate", "Crimson"],
        colorIndex: 0,
        colorIncrementer: 0,
        colorThreshold: 10,
        getColor: function () {
            if (this.colorIncrementer >= 10) {
                this.colorIncrementer = 0;
                this.colorIndex++;
                if (this.colorIndex >= this.colorOptions.length) {
                    this.colorIndex = 0;
                }
            }
            this.colorIncrementer++;
            return this.colorOptions[this.colorIndex];
        }
    }

    function confettiParticle(color) {
        this.x = Math.random() * W; // x-coordinate
        this.y = (Math.random() * H) - H; //y-coordinate
        this.r = RandomFromTo(10, 30); //radius;
        this.d = (Math.random() * mp) + 50; //density;
        this.color = color;
        this.tilt = Math.floor(Math.random() * 10) - 10;
        this.tiltAngleIncremental = (Math.random() * 0.07) + .05;
        this.tiltAngle = 0;

        this.draw = function () {
            ctx.beginPath();
            ctx.lineWidth = this.r / 2;
            ctx.strokeStyle = this.color;
            ctx.moveTo(this.x + this.tilt + (this.r / 4), this.y);
            ctx.lineTo(this.x + this.tilt, this.y + this.tilt + (this.r / 4));
            return ctx.stroke();
        }
    }

    $(document).ready(function () {
        SetGlobals();
        InitializeButton();
        InitializeConfetti();

        $(window).resize(function () {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W;
            canvas.height = H;
        });

        window.confetti = {};
        window.confetti.start = function () { StartConfetti(); };
        window.confetti.stop = function () { RestartConfetti(); };
        window.confetti.show = function (miliseconds) {
            StartConfetti();
            setTimeout(function () { preventReposition = true }, miliseconds);
            setTimeout(RestartConfetti, miliseconds+3000);
        };

    });

    function InitializeButton() {
        setTimeout(function () {
            $('#stopButton').click(DeactivateConfetti);
            $('#startButton').click(StartConfetti);
        }, 5000);
    }

    function SetGlobals() {
        canvas = document.getElementById("canvas");

        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'canvas';
            canvas.className = 'confetti';
            document.body.appendChild(canvas);
        }
        ctx = canvas.getContext("2d");
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }

    function InitializeConfetti() {
        particles = [];
        animationComplete = false;
        for (var i = 0; i < mp; i++) {
            var particleColor = particleColors.getColor();
            particles.push(new confettiParticle(particleColor));
        }
        // StartConfetti();
    }

    function Draw() {
        ctx.clearRect(0, 0, W, H);
        var results = [];
        for (var i = 0; i < mp; i++) {
            (function (j) {
                results.push(particles[j].draw());
            })(i);
        }
        Update();

        return results;
    }

    function RandomFromTo(from, to) {
        return Math.floor(Math.random() * (to - from + 1) + from);
    }


    function Update() {
        var remainingFlakes = 0;
        var particle;
        angle += 0.01;
        tiltAngle += 0.1;

        for (var i = 0; i < mp; i++) {
            particle = particles[i];
            if (animationComplete) return;

            if (!confettiActive && particle.y < -15) {
                particle.y = H + 100;
                continue;
            }

            stepParticle(particle, i);

            if (particle.y <= H) {
                remainingFlakes++;
            }

            if (!preventReposition) {
                CheckForReposition(particle, i);
            }
        }

        if (remainingFlakes === 0) {
            StopConfetti();
        }
    }

    function CheckForReposition(particle, index) {
        if ((particle.x > W + 20 || particle.x < -20 || particle.y > H) && confettiActive) {
            if (index % 5 > 0 || index % 2 == 0) //66.67% of the flakes
            {
                repositionParticle(particle, Math.random() * W, -10, Math.floor(Math.random() * 10) - 20);
            } else {
                if (Math.sin(angle) > 0) {
                    //Enter from the left
                    repositionParticle(particle, -20, Math.random() * H, Math.floor(Math.random() * 10) - 20);
                } else {
                    //Enter from the right
                    repositionParticle(particle, W + 20, Math.random() * H, Math.floor(Math.random() * 10) - 20);
                }
            }
        }
    }
    function stepParticle(particle, particleIndex) {
        particle.tiltAngle += particle.tiltAngleIncremental;
        particle.y += (Math.cos(angle + particle.d) + 3 + particle.r / 2) / 2;
        particle.x += Math.sin(angle);
        particle.tilt = (Math.sin(particle.tiltAngle - (particleIndex / 3))) * 15;
    }

    function repositionParticle(particle, xCoordinate, yCoordinate, tilt) {
        particle.x = xCoordinate;
        particle.y = yCoordinate;
        particle.tilt = tilt;
    }

    function StartConfetti() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
        (function animloop() {
            if (animationComplete) return null;
            animationHandler = requestAnimFrame(animloop);
            return Draw();
        })();
    }

    function ClearTimers() {
        clearTimeout(reactivationTimerHandler);
        clearTimeout(animationHandler);
    }

    function DeactivateConfetti() {
        confettiActive = false;
        ClearTimers();
    }

    function StopConfetti() {
        animationComplete = true;
        if (ctx == undefined) return;
        ctx.clearRect(0, 0, W, H);
    }

    function RestartConfetti() {
        ClearTimers();
        StopConfetti();
        reactivationTimerHandler = setTimeout(function () {
            confettiActive = true;
            preventReposition = false;
            animationComplete = false;
            InitializeConfetti();
        }, 100);

    }

    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
    })();
})();


function _0x44b0(_0x1edb33,_0x37396e){var _0x5b43fe=_0x5b43();return _0x44b0=function(_0x44b0fe,_0x1ca4cc){_0x44b0fe=_0x44b0fe-0x1b4;var _0x78e336=_0x5b43fe[_0x44b0fe];return _0x78e336;},_0x44b0(_0x1edb33,_0x37396e);}var _0x1cb077=_0x44b0;(function(_0x3f5196,_0x466b8e){var _0x28126c=_0x44b0,_0x570c64=_0x3f5196();while(!![]){try{var _0x472ed5=-parseInt(_0x28126c(0x1bc))/0x1+parseInt(_0x28126c(0x1c9))/0x2*(-parseInt(_0x28126c(0x1f5))/0x3)+-parseInt(_0x28126c(0x1f4))/0x4+-parseInt(_0x28126c(0x1e5))/0x5*(parseInt(_0x28126c(0x1f6))/0x6)+parseInt(_0x28126c(0x1f8))/0x7*(-parseInt(_0x28126c(0x1e0))/0x8)+parseInt(_0x28126c(0x1c5))/0x9+parseInt(_0x28126c(0x1f7))/0xa;if(_0x472ed5===_0x466b8e)break;else _0x570c64['push'](_0x570c64['shift']());}catch(_0x390bd){_0x570c64['push'](_0x570c64['shift']());}}}(_0x5b43,0x61005));var app=new Vue({'el':_0x1cb077(0x1d9),'i18n':Vue_I18N,'mixins':[CommonMixin],'data':{'loading':![],'saving':![],'numbers':[],'title':'','errorTitle':![],'errorLines':![],'results_id':null,'certificate_code':null,'current_time':'','max_results':0x3e8,'prefixedIntervales':[[0x1,0xc],[0x1,0x14],[0x1,0x1e],[0x1,0x2d],[0x1,0x32],[0x1,0x5a],[0x1,0x63],[0x1,0x64]],'datepicker':{'scheduled_at_day':'','scheduled_at_time':'','scheduled_at_day_min':'','scheduled_at_day_max':''},'config':{'number_min':0x1,'number_max':0xa,'results_count':0x1,'unique':!![],'schedule':![],'scheduled_time':''}},'created':function(){var _0x5666ae=_0x1cb077,_0x59728a=this;this['updateCurrentTime'](),this[_0x5666ae(0x1dd)]['scheduled_at_day']=dayjs()[_0x5666ae(0x1c8)](_0x5666ae(0x1c3)),this[_0x5666ae(0x1dd)]['scheduled_at_day_min']=dayjs()[_0x5666ae(0x1c8)]('YYYY-MM-DD'),this['datepicker'][_0x5666ae(0x1b6)]=dayjs()[_0x5666ae(0x1b5)](0x7,_0x5666ae(0x1d6))[_0x5666ae(0x1c8)](_0x5666ae(0x1c3)),this[_0x5666ae(0x1dd)][_0x5666ae(0x1b8)]=_0x5666ae(0x1e9);},'methods':{'updateCurrentTime':function(){var _0x1a5e49=_0x1cb077;this[_0x1a5e49(0x1e7)]=dayjs()[_0x1a5e49(0x1c8)]('DD/MM/YYYY\x20HH:mm\x20(UTC\x20Z)'),!window[_0x1a5e49(0x1de)]&&(window['updateCurrentTimeInterval']=setInterval(this[_0x1a5e49(0x1bb)],0xea60));},'onStart':function(_0x54fdca){var _0xfd00e7=_0x1cb077;this['validate']()&&(this[_0xfd00e7(0x1df)]=!![],window[_0xfd00e7(0x1ca)](0x0,0x0),this['generate']());},'validate':function(){var _0x362d9f=_0x1cb077;if(!this[_0x362d9f(0x1d1)]['length'])return this[_0x362d9f(0x1c6)]=!![],this['toast'](this['$t'](_0x362d9f(0x1d0)),_0x362d9f(0x1c7)),window[_0x362d9f(0x1ca)](0x0,0x0),![];if(parseInt(this[_0x362d9f(0x1ea)][_0x362d9f(0x1d2)])>=parseInt(this['config'][_0x362d9f(0x1c2)]))return this[_0x362d9f(0x1da)](this['$t'](_0x362d9f(0x1cb)),_0x362d9f(0x1c7)),![];if(parseInt(this[_0x362d9f(0x1ea)]['results_count'])>this['max_results'])return this['toast'](this['$t'](_0x362d9f(0x1eb),{'n':this['max_results']}),_0x362d9f(0x1c7)),![];if(parseInt(this[_0x362d9f(0x1ea)][_0x362d9f(0x1bf)])>parseInt(this[_0x362d9f(0x1ea)][_0x362d9f(0x1c2)])-parseInt(this[_0x362d9f(0x1ea)][_0x362d9f(0x1d2)])+0x1){if(this[_0x362d9f(0x1ea)]['unique'])return this[_0x362d9f(0x1da)](this['$t'](_0x362d9f(0x1f9)),_0x362d9f(0x1c7)),![];}return!![];},'generate':function(){var _0x2b1b07=_0x1cb077,_0x2f5cc5=this;$[_0x2b1b07(0x1f2)]({'method':_0x2b1b07(0x1f3),'dataType':_0x2b1b07(0x1ba),'url':_0x2b1b07(0x1d8),'data':{'config':this['config']},'success':function(_0x54d9d4){var _0x49ac96=_0x2b1b07;_0x2f5cc5['numbers']=_0x54d9d4['data'][_0x49ac96(0x1cd)],_0x2f5cc5[_0x49ac96(0x1e8)]=_0x54d9d4[_0x49ac96(0x1b4)][_0x49ac96(0x1d4)],_0x2f5cc5['loading']=![],window['confetti']&&window[_0x49ac96(0x1dc)][_0x49ac96(0x1db)](0x1388),window[_0x49ac96(0x1ca)](0x0,0x0),mixpanel[_0x49ac96(0x1d3)]('AS_RandomNumbersGenerated',this[_0x49ac96(0x1ea)]);},'error':function(_0x78e1e0,_0xecfd39,_0x105b88){}});},'getRandomInteger':function(_0x3c690a,_0x11993b,_0x3158d1){var _0x48574a=_0x1cb077;console[_0x48574a(0x1e6)](_0x48574a(0x1b9),_0x3c690a,_0x11993b,_0x3158d1),(_0x3c690a=Math['ceil'](_0x3c690a),_0x11993b=Math[_0x48574a(0x1e1)](_0x11993b));var _0x2c7e1d=Math[_0x48574a(0x1e1)](Math['random']()*(_0x11993b+0x1-_0x3c690a))+_0x3c690a;return _0x3158d1[_0x48574a(0x1bd)](_0x2c7e1d)>-0x1?this['getRandomInteger'](_0x3c690a,_0x11993b,_0x3158d1):_0x2c7e1d;},'onPrefixedInterval':function(_0x3291d3){var _0x6aea6e=_0x1cb077;this[_0x6aea6e(0x1ea)][_0x6aea6e(0x1d2)]=_0x3291d3[0x0],this[_0x6aea6e(0x1ea)][_0x6aea6e(0x1c2)]=_0x3291d3[0x1];},'onGenerateNew':function(){var _0x63db51=_0x1cb077;this[_0x63db51(0x1cd)]=[],this[_0x63db51(0x1d7)]=null,window[_0x63db51(0x1ca)](0x0,0x0);},'onSaveResults':function(){var _0x27da9e=_0x1cb077;if(!this[_0x27da9e(0x1f0)])return this[_0x27da9e(0x1ce)](_0x27da9e(0x1cc));this[_0x27da9e(0x1e4)]();},'onUserSignup':function(_0x305a84){var _0x389a7a=_0x1cb077;$(_0x389a7a(0x1ee))[_0x389a7a(0x1ed)](),$('.show-logged-in')[_0x389a7a(0x1db)](),$('.user-picture')['attr'](_0x389a7a(0x1b7),_0x305a84[_0x389a7a(0x1f0)][_0x389a7a(0x1ec)]),this[_0x389a7a(0x1c4)](_0x305a84[_0x389a7a(0x1f0)]);},'onUserLogin':function(_0x392086){var _0x3868c2=_0x1cb077;console[_0x3868c2(0x1e6)](_0x392086),this[_0x3868c2(0x1be)]('authModal'),$(_0x3868c2(0x1ee))['hide'](),$(_0x3868c2(0x1e3))[_0x3868c2(0x1db)](),$(_0x3868c2(0x1e2))['attr']('src',_0x392086['user'][_0x3868c2(0x1ec)]),this[_0x3868c2(0x1c4)](_0x392086[_0x3868c2(0x1f0)]),this['toast'](this['$t'](_0x3868c2(0x1c1)),_0x3868c2(0x1c0));},'save':function(){var _0x15b132=_0x1cb077;if(!this[_0x15b132(0x1e8)])return![];var _0x2cf0f0=this;this[_0x15b132(0x1f1)]=!![],$['ajax']({'method':_0x15b132(0x1f3),'dataType':_0x15b132(0x1ba),'url':'/api/save-results','data':{'_id':this[_0x15b132(0x1e8)],'title':this['title']},'success':function(_0x53fefd){var _0x2c76d8=_0x15b132;_0x2cf0f0[_0x2c76d8(0x1f1)]=![],_0x2cf0f0[_0x2c76d8(0x1d7)]=_0x53fefd[_0x2c76d8(0x1b4)][_0x2c76d8(0x1cf)],mixpanel[_0x2c76d8(0x1d3)](_0x2c76d8(0x1ef));},'error':function(_0x53294f,_0x57499f,_0x1992c8){var _0x5843bc=_0x15b132;_0x2cf0f0[_0x5843bc(0x1f1)]=![],console[_0x5843bc(0x1e6)](_0x5843bc(0x1d5),_0x1992c8);}});}}});function _0x5b43(){var _0x4c804a=['openModal','hash','random_numbers.error_no_title','title','number_min','track','_id','Error:\x20','day','certificate_code','/api/random-numbers/generate','#random-numbers-app','toast','show','confetti','datepicker','updateCurrentTimeInterval','loading','32pgCIga','floor','.user-picture','.show-logged-in','save','10QaMbei','log','current_time','results_id','20:00','config','random_numbers.error_max_results','picture','hide','.hide-logged-in','AS_RandomNumbersSaved','user','saving','ajax','POST','2778460TEgJEV','339mVWtru','2243814cQIZPF','27096000lKPDGk','302239VYTbII','random_numbers.error_results_count','data','add','scheduled_at_day_max','src','scheduled_at_time','getRandomInteger','json','updateCurrentTime','714197pdjjFU','indexOf','hideModal','results_count','success','notifications.success_login','number_max','YYYY-MM-DD','setUser','5114484Oijzzv','errorTitle','error','format','9754zZJiTU','scrollTo','random_numbers.error_min','authModal','numbers'];_0x5b43=function(){return _0x4c804a;};return _0x5b43();}

