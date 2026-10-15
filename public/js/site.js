$(function(){
  $('#year').text(new Date().getFullYear());
  $('.menu-toggle').on('click',()=>$('.main-nav').toggleClass('open'));
  $('.main-nav a').on('click',()=>$('.main-nav').removeClass('open'));
  $('#booking-date').attr('min',new Date().toISOString().slice(0,10));
  const money=n=>'Rs. '+Number(n||0).toLocaleString('en-LK',{maximumFractionDigits:2});
  function showToast(text){const t=$('#toast');t.text(text).addClass('show');setTimeout(()=>t.removeClass('show'),3500)}
  function loadServices(){
    $.getJSON('/api/public/services').done(rows=>{
      const cards=$('#service-cards').empty(),select=$('#booking-service').empty().append('<option value="">Choose a package</option>');
      if(!rows.length){cards.html('<p class="muted">Packages will be announced soon.</p>');return;}
      rows.forEach((s,i)=>{
        $('<article class="service-card">').append($('<span class="service-number">').text(String(i+1).padStart(2,'0')))
          .append($('<h3>').text(s.name)).append($('<p>').text(s.description||s.category))
          .append($('<div class="service-meta">').append($('<span>').text(`${s.category} · ${s.duration_hours} hrs`)).append($('<span class="service-price">').text(money(s.price))))
          .append($('<a class="service-link" href="#booking">').text('Book this package ↗').on('click',()=>select.val(String(s.id)))).appendTo(cards);
        $('<option>').val(s.id).text(`${s.name} — ${money(s.price)}`).appendTo(select);
      });
    }).fail(()=>$('#service-cards').html('<p class="muted">Packages are temporarily unavailable. Please try again later.</p>'));
  }
  loadServices();
  $('#booking-form').on('submit',function(e){e.preventDefault();const form=this,msg=$('#booking-message');msg.removeClass('error').text('Sending your request…');$.ajax({url:'/api/public/bookings',method:'POST',contentType:'application/json',data:JSON.stringify(Object.fromEntries(new FormData(form).entries()))}).done(r=>{msg.text(r.message+` Reference: #${r.booking_id}`);form.reset();$('#booking-date').attr('min',new Date().toISOString().slice(0,10));showToast('Booking request submitted');}).fail(xhr=>msg.addClass('error').text(xhr.responseJSON?.error||'Could not submit booking. Please try again.'));});
});
