'use strict';

//var vConsole = new VConsole();
new ClipboardJS('.clip_btn');

const base_url = "【パスワードマネージャのサーバのURL】";

const EXPIRES = 356 * 10;

var vue_options = {
    el: "#top",
    data: {
        insert_name: "",
        insert_url: "",
        insert_userid: "",
        insert_password: "",
        update_uuid: "",
        update_name: "",
        update_url: "",
        update_userid: "",
        get: {},
        chk_special_pattern: '-+*/_',
        chk_number: true,
        chk_upper: true,
        chk_special: true,
        chk_exception: true,

        client_id: null,

        pwd_list: [],
        apikey: null,

        progress_title: '', // for progress-dialog
    },
    computed: {
    },
    methods: {
        show_qrcode: async function (index) {
            try{
                var param = {
                    uuid: this.pwd_list[index].uuid,
                };
                var json = await do_post_apikey(base_url + '/pwd-get', param, this.apikey);
                var element = document.querySelector('#qrcode_area');
                element.innerHTML = '';
                new QRCode(element, json.result.password);
                this.dialog_open("#qrcode_dialog");
            } catch (error) {
                console.error(error);
                alert(error);
            }
        },
        clip_copy: async function(index){
            try{
                var param = {
                    uuid: this.pwd_list[index].uuid,
                };
                var json = await do_post_apikey(base_url + '/pwd-get', param, this.apikey);
                navigator.clipboard.writeText(json.result.password);
                this.toast_show("クリップボードにコピーしました。");
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        password_create: function(){
            var passwd_num = 12;
            var passwd_number_num = this.chk_number ? 1 : 0;
            var passwd_symbol_num = this.chk_special ? 1 : 0;

            var kind = Array(passwd_num);
            kind.fill(0);
            for( var i = 0 ; i < passwd_number_num ; i++ )
                kind[i] = 'n';
            for( var i = 0 ; i < passwd_symbol_num ; i++ )
                kind[passwd_number_num + i] = 's';

            for( var i = 0 ; i < passwd_num ; i++ ){
                var index = make_random(passwd_num - 1);
                if( index == i || kind[i] == kind[index] )
                    continue;
                var temp = kind[i];
                kind[i] = kind[index];
                kind[index] = temp;
            }

            const number_pattern = '0123456789';
            var alpha_pattern = '';
            if( this.passwd_check_ecept_lO )
                alpha_pattern += "abcdefghijkmnopqrstuvwxyz";
            else
                alpha_pattern += "abcdefghijklmnopqrstuvwxyz";
            if( this.chk_upper ){
                if( this.chk_exception )
                    alpha_pattern += "ABCDEFGHJKLMNPQRSTUVWXYZ";
                else
                    alpha_pattern += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            }

            var passwd = '';
            for( var i = 0 ; i < kind.length ; i++ ){
                if( kind[i] == 'n' ){
                    var index = make_random(number_pattern.length - 1);
                    passwd += number_pattern.charAt(index);
                }else if( kind[i] == 's' ){
                    var pattern = this.chk_special_pattern;
                    var index = make_random(pattern.length - 1);
                    passwd += pattern.charAt(index);
                }else{
                    var index = make_random(alpha_pattern.length - 1);
                    passwd += alpha_pattern.charAt(index);
                }
            }

            this.insert_password = passwd;
        },
        password_insert: async function(){
            try{
                var param = {
                    name: this.insert_name,
                    url: this.insert_url,
                    userid: this.insert_userid,
                    password: this.insert_password
                };
                var json = await do_post_apikey(base_url + '/pwd-insert', param, this.apikey);
                console.log(json);
                alert('追加しました。');
                this.password_list_update();
                this.dialog_close('#insert_dialog');
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        password_list_update: async function(){
            try{
                var json = await do_post_apikey(base_url + '/pwd-list', {}, this.apikey);
                this.pwd_list = json.result;
//                console.log(this.pwd_list);
            }catch(error){
                console.log(error);
                alert('リスト取得に失敗しました: ' + error);
            }
        },
        password_delete: async function(index){
            if( !confirm('本当に削除しますか？') )
                return;

            try{
                var param = {
                    uuid: this.pwd_list[index].uuid
                };
                var json = await do_post_apikey(base_url + '/pwd-delete', param, this.apikey);
                console.log(json);
                alert('削除しました。');
                this.password_list_update();
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        password_update: async function(){
            if( !confirm('本当に変更しますか？') )
                return;

            try{
                var param = {
                    uuid: this.update_uuid,
                    name: this.update_name,
                    url: this.update_url,
                    userid: this.update_userid,
                    password: this.insert_password
                };
                var json = await do_post_apikey(base_url + '/pwd-update', param, this.apikey);
                alert('変更しました。');
                this.password_list_update();
                this.dialog_close('#update_dialog');
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        show_insert_dialog: function(){
            this.insert_name = "";
            this.insert_url = "";
            this.insert_userid = "";
            this.insert_password = "";
            this.dialog_open("#insert_dialog");
        },
        show_update_dialog: async function(index){
            try{
                var param = {
                    uuid: this.pwd_list[index].uuid,
                };
                var json = await do_post_apikey(base_url + '/pwd-get', param, this.apikey);
                var item = json.result;
                this.update_uuid = item.uuid;
                this.update_name = item.name;
                this.update_url = item.url;
                this.update_userid = item.userid;
                this.insert_password = item.password;
                this.dialog_open("#update_dialog");
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
	show_get_dialog: async function(index){
            try{
                var param = {
                    uuid: this.pwd_list[index].uuid,
                };
                var json = await do_post_apikey(base_url + '/pwd-get', param, this.apikey);
                this.get = json.result;
                this.dialog_open("#get_dialog");
            }catch(error){
                console.error(error);
                alert(error);
            }
        },
        set_apikey: function(){
            var value = prompt("API Keyを指定してください。", this.apikey);
            if( !value )
                return;

            this.apikey = value;
            Cookies.set("apikey", this.apikey, { expires: EXPIRES });
            alert('設定しました。リロードしてください。');
        },
        show_newpage: function(url){
            window.open(url);
        },
        do_subscribe: async function(){
            navigator.serviceWorker.ready.then(async (registration) =>{
                try{
                    if( this.client_id ){
                        var client_id = this.client_id;
                        this.client_id = null;
                        Cookies.remove('client_id');
                        registration.pushManager.getSubscription().then((subscription) => {
                            subscription.unsubscribe();
                            alert('通知を解除しました。');
                        });
                        await do_post_apikey(base_url + '/pwd-delete-object', { client_id: client_id }, this.apikey);
                    }else{
                        var json = await do_post_apikey(base_url + '/pwd-get-pubkey', {}, this.apikey);

                        var object = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: json.result.vapidkey
                        });
                        var test = JSON.parse(JSON.stringify(object));
                        console.log(test);
                        await do_post_apikey(base_url + '/pwd-put-object', { client_id: json.result.client_id, object: object }, this.apikey);
        
                        this.client_id = json.result.client_id;
                        Cookies.set('client_id', this.client_id, { expires: EXPIRES });
                    }
                }catch(error){
                    console.error(error);
                    alert(error);
                }
            });
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(async (registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }).catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
        }

        this.client_id = Cookies.get('client_id');
        this.apikey = Cookies.get('apikey');
        if( this.apikey ){
            this.password_list_update();
        }else{
           setTimeout( () =>{
                alert('API Keyを指定してください。');
            }, 0);
        }
    }
};
vue_add_methods(vue_options, methods_bootstrap);
vue_add_components(vue_options, components_bootstrap);
var vue = new Vue( vue_options );

function make_random(max){
	return Math.floor(Math.random() * (max + 1));
}

function do_post_apikey(url, body, apikey) {
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "X-API-KEY": apikey });

    return fetch(new URL(url).toString(), {
        method: 'POST',
        body: JSON.stringify(body),
        headers: headers
        })
        .then((response) => {
        if (!response.ok)
            throw 'status is not 200';
        return response.json();
    });
}
