$(function(){
  function message(id,text,error=false){$(id).toggleClass('error',error).text(text)}
  $.getJSON('/api/session').done(s=>{if(s.authenticated)location.href='/admin';});
  $('#login-form').on('submit',function(e){e.preventDefault();message('#login-message','Signing in…');$.ajax({url:'/api/auth/login',method:'POST',contentType:'application/json',data:JSON.stringify(Object.fromEntries(new FormData(this).entries()))}).done(()=>location.href='/admin').fail(xhr=>message('#login-message',xhr.responseJSON?.error||'Login failed.',true));});
  // The server intentionally provides a first-admin endpoint; allow setup to be attempted if no admin exists.
  $.getJSON('/api/auth/setup-status').done(r=>$('#setup-box').prop('hidden',r.exists)).fail(()=>{
    // Safe, simple fallback: first-time setup form can be opened manually by adding ?setup=1.
    if(new URLSearchParams(location.search).get('setup')==='1')$('#setup-box').prop('hidden',false);
  });
  $('#setup-form').on('submit',function(e){e.preventDefault();message('#setup-message','Creating administrator…');$.ajax({url:'/api/auth/register-first-admin',method:'POST',contentType:'application/json',data:JSON.stringify(Object.fromEntries(new FormData(this).entries()))}).done(()=>location.href='/admin').fail(xhr=>message('#setup-message',xhr.responseJSON?.error||'Setup failed.',true));});
});
