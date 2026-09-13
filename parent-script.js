(function () {
  'use strict';

  var PROD_IFRAME_ORIGIN = 'https://hime-haruka.github.io';
  var IFRAME_PATH = '/khaki30-artmug';
  var IFRAME_SELECTOR = 'section[name="am-root"] iframe[src*="hime-haruka.github.io/khaki30-artmug"], [name="am-root"] iframe[src*="hime-haruka.github.io/khaki30-artmug"], iframe[src*="hime-haruka.github.io/khaki30-artmug"], iframe[data-khaki30-artmug], section[name="am-root"] iframe';
  var STYLE_ID = 'khaki30-artmug-parent-style-v21';
  var lastHeight = 0;
  var retryTimer = null;
  var cachedIframe = null;
  var viewportFrame = 0;

  var scriptUrl = (document.currentScript && document.currentScript.src) || '';
  var assetBase = './';
  try { assetBase = new URL('./', scriptUrl || window.location.href).href; } catch (e) {}

  var MAIN_ITEMS = [
    { id: 'top', label: 'TOP' },
    { id: 'intro', label: '작가 소개' },
    { id: 'calendar', label: '예약 현황' },
    { id: 'process', label: '작업 순서' },
    { id: 'notice', label: '공지사항' },
    { id: 'price', label: '가격 / 옵션' },
    { id: 'portfolio', label: '포트폴리오' },
    { id: 'form', label: '신청 양식' }
  ];

  function injectStyle() {
    document.querySelectorAll('[id^="syura-floating-nav-style"],[id^="khaki30-artmug-parent-style"],#siwol-artmug-parent-style').forEach(function (node) { node.remove(); });
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
:root{--kh-olive:#97ac82;--kh-olive-2:#879d73;--kh-olive-3:#71875f;--kh-deep:#405a37;--kh-deep-2:#31472b;--kh-pale:#edf2e8;--kh-pale-2:#f5f7f1;--kh-paper:#f7f8f1;--kh-line:rgba(86,115,76,.16);--kh-line-strong:rgba(86,115,76,.28)}


html body #wrapBody .orange,
html body #wrapBody font.orange,
html body #wrapBody .noticeIcon_o,
html body #wrapBody .caution.orange,
html body #wrapBody .guide .orange,
html body #wrapBody [style*="color: #ff5e26"],
html body #wrapBody [style*="color:#ff5e26"],
html body #wrapBody [style*="color: rgb(255, 94, 38)"]{color:var(--kh-olive-3)!important}

html body #wrapBody #goods_head{border-bottom-color:var(--kh-line)!important}
html body #wrapBody #goods_head .making{border:1px solid rgba(151,172,130,.22)!important;border-radius:999px!important;background:var(--kh-pale)!important;color:var(--kh-deep)!important}
html body #wrapBody #goods_head .goods_title,
html body #wrapBody #goods_head .goods_title a{color:var(--kh-deep-2)!important}
html body #wrapBody #goods_head .view_modi{border-color:var(--kh-line)!important;background:#fff!important;color:#6f7c69!important}
html body #wrapBody #goods_head .view_modi:hover{border-color:rgba(151,172,130,.48)!important;background:var(--kh-pale)!important;color:var(--kh-deep)!important}

html body #wrapBody #rightInfo,
html body #wrapBody #profile,
html body #wrapBody #goodsInfo,
html body #wrapBody #goodsOrder{border-color:var(--kh-line)!important}
html body #wrapBody #rightInfo{box-shadow:0 14px 34px rgba(63,85,55,.07)!important}
html body #wrapBody #profile .nic_name,
html body #wrapBody #profile .nic_name a,
html body #wrapBody #goodsInfo .head,
html body #wrapBody #goodsOrder .head,
html body #wrapBody .goodsTitle_op,
html body #wrapBody .totalTitle{color:var(--kh-deep)!important}
html body #wrapBody #receive_Y{border-color:rgba(113,135,95,.34)!important;background:linear-gradient(135deg,#a5b990,#879d73)!important;color:#fff!important;box-shadow:0 7px 18px rgba(86,115,76,.16)!important}

html body #wrapBody #goodsInfo .left_right_dl,
html body #wrapBody #goodsOrder .clearfix,
html body #wrapBody #optionPrice li,
html body #wrapBody .orderline{border-color:var(--kh-line)!important}
html body #wrapBody .opBox{border-color:var(--kh-line-strong)!important;background:#fff!important}
html body #wrapBody .opBox:hover{border-color:rgba(151,172,130,.6)!important}
html body #wrapBody .add_price{border-color:var(--kh-line-strong)!important}
html body #wrapBody .add_price:focus{outline:none!important;border-color:var(--kh-olive)!important;box-shadow:0 0 0 3px rgba(151,172,130,.13)!important}
html body #wrapBody .addBtn{border-color:transparent!important;background:var(--kh-pale)!important;color:var(--kh-deep)!important}
html body #wrapBody .addBtn:hover{background:#e3eadc!important}
html body #wrapBody #payment .totalPrice,
html body #wrapBody #payment #totals{color:var(--kh-deep)!important}

html body #wrapBody .btn1,
html body #wrapBody .btn_qna,
html body #wrapBody .btn_order,
html body #wrapBody .sBtn1{border-color:transparent!important;color:#fff!important;text-shadow:none!important;box-shadow:0 8px 18px rgba(63,85,55,.14)!important;transition:background-color .18s ease,box-shadow .18s ease,transform .18s ease!important}
html body #wrapBody .btn1,
html body #wrapBody .btn_qna,
html body #wrapBody .sBtn1{background:linear-gradient(135deg,#9fb28b,#7f966c)!important}
html body #wrapBody .btn_order{background:linear-gradient(135deg,#71875f,#526b48)!important}
html body #wrapBody .btn1:hover,
html body #wrapBody .btn_qna:hover,
html body #wrapBody .sBtn1:hover{background:linear-gradient(135deg,#93aa7d,#71885f)!important;box-shadow:0 10px 22px rgba(63,85,55,.19)!important}
html body #wrapBody .btn_order:hover{background:linear-gradient(135deg,#667d55,#465f3d)!important;box-shadow:0 10px 22px rgba(63,85,55,.2)!important}

html body #wrapBody #cont_qna .s_title,
html body #wrapBody #cont_after .s_title{color:var(--kh-deep-2)!important}
html body #wrapBody #cont_qna .answer_per,
html body #wrapBody #cont_qna .answer_per font{color:var(--kh-olive-3)!important}
html body #wrapBody .listTh{border-color:var(--kh-line)!important;background:#f3f6ef!important;color:#64705f!important}
html body #wrapBody .line_bottom,
html body #wrapBody #list_qna tr>td,
html body #wrapBody #list_after tr>td{border-color:rgba(86,115,76,.12)!important}
html body #wrapBody .starBg{filter:hue-rotate(62deg) saturate(.58) brightness(.92)!important}
html body #wrapBody #paging2 .selected,
html body #wrapBody #paging3 .selected{color:var(--kh-deep)!important;border-color:rgba(151,172,130,.28)!important;background:var(--kh-pale)!important}
html body #wrapBody #paging2 .defaultOver,
html body #wrapBody #paging3 .defaultOver,
html body #wrapBody .pn_page:hover{color:var(--kh-deep)!important}

html body #wrapBody #topUtil a:hover,
html body #wrapBody #topUtil .menuTop:hover,
html body #wrapBody #topUtil #topbtn1:hover,
html body #wrapBody #topUtil #topbtn2:hover{color:var(--kh-olive-3)!important}

html body #wrapBody [style*="background: #ff5e26"],
html body #wrapBody [style*="background:#ff5e26"],
html body #wrapBody [style*="background-color: #ff5e26"],
html body #wrapBody [style*="background-color:#ff5e26"],
html body #wrapBody [style*="background-color: rgb(255, 94, 38)"]{background-color:var(--kh-olive)!important}

html body #wrapBody #help_left,
html body #wrapBody #cont_qna a:hover,
html body #wrapBody #cont_after a:hover{color:var(--kh-olive-3)!important}


body.khaki30-artmug-theme #topUtil{
  background:var(--kh-olive)!important;
  border-bottom:1px solid rgba(64,90,55,.14)!important;
  box-shadow:0 6px 22px rgba(64,90,55,.10)!important;
}
body.khaki30-artmug-theme #topUtil .menuTop:hover{background:#839873!important}
body.khaki30-artmug-theme #topUtil #topbtn1{background:var(--kh-deep)!important}
body.khaki30-artmug-theme #topUtil #topbtn2{background:#718060!important}
body.khaki30-artmug-theme #topUtil .menuTop_s,
body.khaki30-artmug-theme #topUtil .menuTop_s ul{background:var(--kh-deep)!important}
body.khaki30-artmug-theme #topUtil .menuTop_s ul:hover{background:#2f422b!important}
body.khaki30-artmug-theme #topUtil .badge,
body.khaki30-artmug-theme #topUtil .cnt_bbs{background:#fff!important;color:var(--kh-deep)!important}
body.khaki30-artmug-theme #topUtil #logo,
body.khaki30-artmug-theme #topUtil .logo,
body.khaki30-artmug-theme #topUtil [class*="logo"]{background:transparent!important}
body.khaki30-artmug-theme #topUtil #logo img,
body.khaki30-artmug-theme #topUtil .logo img,
body.khaki30-artmug-theme #topUtil [class*="logo"] img,
body.khaki30-artmug-theme #topUtil img[src*="logo"]{filter:hue-rotate(78deg) saturate(.18) brightness(1.325)!important}

body.khaki30-artmug-theme .orange,
body.khaki30-artmug-theme .lorange,
body.khaki30-artmug-theme .mColor,
body.khaki30-artmug-theme .mColor2,
body.khaki30-artmug-theme .cateColor2,
body.khaki30-artmug-theme .ajax_alert,
body.khaki30-artmug-theme .new_dot,
body.khaki30-artmug-theme #profile .goods_more a,
body.khaki30-artmug-theme #cont_qna .secret_noti,
body.khaki30-artmug-theme #order_input .bill_remark,
body.khaki30-artmug-theme #advertising .price,
body.khaki30-artmug-theme #advertising .price_sale,
body.khaki30-artmug-theme #advertising .sale,
body.khaki30-artmug-theme #list_img .btnModi,
body.khaki30-artmug-theme #simple_guide .number,
body.khaki30-artmug-theme #simple_guide .tab_on{
  color:var(--kh-olive-3)!important;
}

body.khaki30-artmug-theme .btn2,
body.khaki30-artmug-theme .sBtn2,
body.khaki30-artmug-theme .ssBtn2,
body.khaki30-artmug-theme .searchBtn a,
body.khaki30-artmug-theme #guide_btn1,
body.khaki30-artmug-theme #goodsOrder .btn_order,
body.khaki30-artmug-theme #comp_map{
  background:var(--kh-olive)!important;
  color:#fff!important;
}
body.khaki30-artmug-theme .btn2:hover,
body.khaki30-artmug-theme .sBtn2:hover,
body.khaki30-artmug-theme .ssBtn2:hover,
body.khaki30-artmug-theme .searchBtn a:hover,
body.khaki30-artmug-theme #guide_btn1:hover,
body.khaki30-artmug-theme #goodsOrder .btn_order:hover{
  background:#839873!important;
}

body.khaki30-artmug-theme .round_btn_oran{
  border-color:var(--kh-olive)!important;
  color:var(--kh-deep)!important;
}
body.khaki30-artmug-theme .round_btn_oran:hover{background:var(--kh-pale)!important}

body.khaki30-artmug-theme .checks.etrans input[type="checkbox"] + label:before{
  border-color:var(--kh-olive)!important;
}
body.khaki30-artmug-theme .checks.etrans input[type="checkbox"]:checked + label:before{
  border-color:transparent var(--kh-olive) var(--kh-olive) transparent!important;
}
body.khaki30-artmug-theme .no-csstransforms .checks.etrans input[type="checkbox"]:checked + label:before{
  color:var(--kh-olive-3)!important;
  border-color:var(--kh-olive)!important;
}

body.khaki30-artmug-theme #receive_Y{
  background:rgba(151,172,130,.12)!important;
  border-color:var(--kh-olive)!important;
  color:var(--kh-deep)!important;
  box-shadow:none!important;
}
body.khaki30-artmug-theme #goodsInfo .head,
body.khaki30-artmug-theme #goodsOrder .head,
body.khaki30-artmug-theme #goodsInfo .head *,
body.khaki30-artmug-theme #goodsOrder .head *{
  background:var(--kh-deep)!important;
  color:#fff!important;
}
body.khaki30-artmug-theme #goodsOrder .addBtn{
  background:var(--kh-olive-3)!important;
  color:#fff!important;
}
body.khaki30-artmug-theme #goodsOrder .addBtn:hover{background:var(--kh-deep)!important}
body.khaki30-artmug-theme #goodsOrder .orderline,
body.khaki30-artmug-theme #goodsOrder .optionline{border-top-color:rgba(64,90,55,.42)!important}

body.khaki30-artmug-theme #cont_after .listTh,
body.khaki30-artmug-theme #cont_qna .listTh,
body.khaki30-artmug-theme #cont_after .listTh *,
body.khaki30-artmug-theme #cont_qna .listTh *{
  background:var(--kh-deep)!important;
  color:#fff!important;
  border-color:var(--kh-deep)!important;
}
body.khaki30-artmug-theme #cont_qna .answer_per{
  border-color:rgba(151,172,130,.38)!important;
  background:var(--kh-pale-2)!important;
  color:var(--kh-deep)!important;
}
body.khaki30-artmug-theme #cont_qna .reply_btn_bk{background:var(--kh-deep)!important}
body.khaki30-artmug-theme #cont_qna .reply_btn_bk:hover{background:#2f422b!important}

body.khaki30-artmug-theme #main_search .sch_box{border-color:var(--kh-olive)!important}
body.khaki30-artmug-theme #simple_guide .tab_on{border-bottom-color:var(--kh-olive)!important}

body.khaki30-artmug-theme .noticeIcon_o,
body.khaki30-artmug-theme .noticeIcon_o2,
body.khaki30-artmug-theme .noticeDiv{
  background-image:none!important;
  position:relative!important;
}
body.khaki30-artmug-theme .noticeIcon_o:before,
body.khaki30-artmug-theme .noticeIcon_o2:before,
body.khaki30-artmug-theme .noticeDiv:before{
  content:"!";
  position:absolute;
  left:0;
  top:50%;
  width:15px;
  height:15px;
  margin-top:-8px;
  border:1px solid rgba(113,135,95,.55);
  border-radius:50%;
  color:var(--kh-olive-3);
  font:700 10px/14px Arial,sans-serif;
  text-align:center;
}

body.khaki30-artmug-theme [style*="#ff5e26"],
body.khaki30-artmug-theme [style*="#ff5200"],
body.khaki30-artmug-theme [style*="#ff4d0f"],
body.khaki30-artmug-theme [style*="#ff8238"],
body.khaki30-artmug-theme [style*="rgb(255, 94, 38)"],
body.khaki30-artmug-theme [style*="rgb(255, 82, 0)"]{
  border-color:var(--kh-olive)!important;
}

#detailViews.khaki30-detail-zone{
  position:relative!important;
  isolation:isolate!important;
  overflow:visible!important;
  margin-top:0!important;
  padding:54px 0 74px!important;
  background:
    radial-gradient(circle at 10% 18%,rgba(151,172,130,.18),transparent 20%),
    radial-gradient(circle at 91% 9%,rgba(151,172,130,.15),transparent 19%),
    linear-gradient(180deg,rgba(247,249,242,.72),rgba(239,244,234,.64) 48%,rgba(250,250,246,.3));
}
#detailViews.khaki30-detail-zone>.detailinfo,
#detailViews.khaki30-detail-zone>.tcenter,
#detailViews.khaki30-detail-zone>.caution{position:relative;z-index:3}
#detailViews.khaki30-detail-zone .detailinfo,
#detailViews.khaki30-detail-zone .showcontent{overflow:visible!important;max-height:none!important}
#detailViews.khaki30-detail-zone section[name="am-root"]{position:relative;z-index:3;width:100%;margin:0 auto}
#detailViews.khaki30-detail-zone [name="stage"]{box-sizing:border-box;position:relative;width:min(1260px,100%);margin:0 auto;padding:0 40px}
#detailViews.khaki30-detail-zone iframe[data-khaki30-parent-bound="1"],
#detailViews.khaki30-detail-zone section[name="am-root"] iframe{
  display:block!important;
  width:100%!important;
  max-width:1180px!important;
  margin:0 auto!important;
  border:1px solid rgba(86,115,76,.10)!important;
  border-radius:26px!important;
  background:#f7f8f1!important;
  box-shadow:0 24px 65px rgba(63,85,55,.14)!important;
}
















.khaki30-after-zone{position:relative!important;isolation:isolate!important;border-radius:34px;margin-top:36px!important;padding-left:34px!important;padding-right:34px!important;background:linear-gradient(180deg,rgba(248,249,243,.78),rgba(240,245,235,.72))!important;box-shadow:0 18px 54px rgba(86,115,76,.08)}
.khaki30-after-zone>#cont_qna,.khaki30-after-zone>#cont_after{position:relative;z-index:2}







.khaki30-floating-nav{position:fixed;top:118px;right:22px;z-index:999999;width:200px;font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",sans-serif;color:var(--kh-deep)}
.khaki30-floating-nav__inner{overflow:hidden;border:1px solid rgba(86,115,76,.20);border-radius:18px;background:rgba(248,249,243,.95);padding:10px;box-shadow:0 15px 38px rgba(63,85,55,.18);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.khaki30-floating-nav__brand{padding:11px 10px 10px;color:var(--kh-deep);font-family:Georgia,serif;font-size:14px;letter-spacing:.08em;text-align:center}
.khaki30-floating-nav__brand span{display:block;margin-top:3px;color:#87957f;font-family:Pretendard,"Noto Sans KR",sans-serif;font-size:9px;letter-spacing:.16em}
.khaki30-floating-nav__menu{display:grid;gap:6px}
.khaki30-floating-nav__button{width:100%;height:38px;border:1px solid rgba(86,115,76,.11);border-radius:9px;background:rgba(255,255,255,.88);color:#5a6954;font:inherit;font-size:12px;font-weight:650;cursor:pointer;transition:background-color .18s ease,border-color .18s ease,color .18s ease,box-shadow .18s ease}
.khaki30-floating-nav__button:hover{border-color:rgba(151,172,130,.38);background:#edf2e8;color:var(--kh-deep);box-shadow:0 5px 14px rgba(86,115,76,.08)}
.khaki30-floating-nav__button--contact{border-color:transparent;background:linear-gradient(135deg,#97ac82,#617a54);color:#fff}
.khaki30-floating-nav__button--contact:hover{background:linear-gradient(135deg,#8ea579,#536d49);color:#fff}
.khaki30-floating-nav__button--review{background:#eef3e9;color:#536d49}
.khaki30-floating-nav__dots{display:flex;justify-content:center;gap:5px;padding:8px 0 2px}.khaki30-floating-nav__dots span{width:4px;height:4px;border-radius:50%;background:#9fb293}

@media(max-width:1280px){#detailViews.khaki30-detail-zone [name="stage"]{padding-left:22px;padding-right:22px}}
@media(max-width:900px){.khaki30-floating-nav{display:none!important}#detailViews.khaki30-detail-zone [name="stage"]{padding:0 10px}.khaki30-after-zone{padding-left:18px!important;padding-right:18px!important}}


#detailViews.khaki30-detail-zone [name="stage"]{overflow:visible!important;isolation:isolate!important}
#detailViews.khaki30-detail-zone [name="stage"]>iframe{position:relative!important;z-index:2!important}


























@media(max-width:1280px){}
@media(max-width:900px){}



















@media(max-width:1280px){}
@media(max-width:900px){}












@media(max-width:900px){}

















`
    document.head.appendChild(style);
  }

  function getIframe() {
    if (cachedIframe && cachedIframe.isConnected) return cachedIframe;
    cachedIframe = document.querySelector(IFRAME_SELECTOR);
    return cachedIframe;
  }

  function getIframeOrigin(iframe) {
    if (!iframe) return PROD_IFRAME_ORIGIN;
    try { return new URL(iframe.getAttribute('src') || iframe.src, window.location.href).origin; }
    catch (e) { return PROD_IFRAME_ORIGIN; }
  }

  function getPageScrollY() { return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0; }

  function sendViewport() {
    if (viewportFrame) return;
    viewportFrame = window.requestAnimationFrame(function () {
      viewportFrame = 0;
      var iframe = getIframe();
      if (!iframe || !iframe.contentWindow) return;
      var rect = iframe.getBoundingClientRect();
      iframe.contentWindow.postMessage({
        source: 'syura-artmug-parent',
        type: 'SYURA_PARENT_VIEWPORT',
        iframeTop: rect.top,
        iframeHeight: rect.height,
        viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
        scrollY: getPageScrollY()
      }, getIframeOrigin(iframe));
    });
  }

  function requestChildScroll(sectionId) {
    if (sectionId === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var iframe = getIframe();
    if (!iframe || !iframe.contentWindow || !sectionId) return;
    iframe.contentWindow.postMessage({ source: 'syura-artmug-parent', type: 'SYURA_PARENT_NAV_TO', sectionId: sectionId, navHeight: 0 }, getIframeOrigin(iframe));
  }

  function getArtmugUid() {
    var candidates = [];
    try {
      var current = new URL(window.location.href);
      candidates.push(current.searchParams.get('uid'));
      candidates.push(current.searchParams.get('number'));
    } catch (e) {}
    document.querySelectorAll('[onclick*="qna_write.php?number="],a[href*="qna_write.php?number="],a[href*="channel=view"][href*="uid="],input[name="p_number"]').forEach(function (node) {
      candidates.push(node.getAttribute('onclick') || '');
      candidates.push(node.getAttribute('href') || '');
      candidates.push(node.value || '');
    });
    for (var i = 0; i < candidates.length; i += 1) {
      var value = String(candidates[i] || '');
      if (/^\d+$/.test(value)) return value;
      var qna = value.match(/qna_write\.php\?[^'\"]*?number=(\d+)/i);
      if (qna) return qna[1];
      var uid = value.match(/[?&]uid=(\d+)/i);
      if (uid) return uid[1];
      var number = value.match(/[?&]number=(\d+)/i);
      if (number) return number[1];
    }
    return '';
  }

  function openInquiry() {
    var uid = getArtmugUid();
    if (!uid) return;
    try {
      if (window.pLightBox && typeof window.pLightBox.show === 'function') {
        window.pLightBox.show('php/qna_write.php?number=' + uid, 'iframe_w', '1080', '500', '문의하기', '0');
        if (typeof window.qnaAlert === 'function') window.qnaAlert();
        return;
      }
    } catch (e) {}
    var existing = Array.from(document.querySelectorAll('.sBtn1,[onclick*="qna_write.php?number="]')).find(function (node) {
      return node && !node.closest('.khaki30-floating-nav') && /qna_write\.php\?/.test(node.getAttribute('onclick') || '');
    });
    if (existing && typeof existing.click === 'function') existing.click();
  }

  function scrollToReview() {
    var target = document.querySelector('#cont_after .s_title') || Array.from(document.querySelectorAll('.s_title')).find(function (node) { return String(node.textContent || '').trim() === '이용 후기'; });
    if (!target) return;
    var y = getPageScrollY() + target.getBoundingClientRect().top - 86;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }

  function removeOldNavs() { document.querySelectorAll('#siwol-artmug-parent-nav,.syura-floating-nav,.khaki30-floating-nav').forEach(function (node) { node.remove(); }); }

  function buildNav() {
    removeOldNavs();
    var nav = document.createElement('div');
    nav.className = 'khaki30-floating-nav';
    var inner = document.createElement('div');
    inner.className = 'khaki30-floating-nav__inner';
    var brand = document.createElement('div');
    brand.className = 'khaki30-floating-nav__brand';
    brand.innerHTML = 'KHAKI30<span>AVATAR COMMISSION</span>';
    var menu = document.createElement('div');
    menu.className = 'khaki30-floating-nav__menu';
    MAIN_ITEMS.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'khaki30-floating-nav__button';
      button.textContent = item.label;
      button.addEventListener('click', function () { requestChildScroll(item.id); });
      menu.appendChild(button);
    });
    var inquiryButton = document.createElement('button');
    inquiryButton.type = 'button';
    inquiryButton.className = 'khaki30-floating-nav__button khaki30-floating-nav__button--contact';
    inquiryButton.textContent = '문의하기';
    inquiryButton.addEventListener('click', openInquiry);
    menu.appendChild(inquiryButton);
    var reviewButton = document.createElement('button');
    reviewButton.type = 'button';
    reviewButton.className = 'khaki30-floating-nav__button khaki30-floating-nav__button--review';
    reviewButton.textContent = '이용 후기';
    reviewButton.addEventListener('click', scrollToReview);
    menu.appendChild(reviewButton);
    var dots = document.createElement('div');
    dots.className = 'khaki30-floating-nav__dots';
    for (var i = 0; i < 4; i += 1) dots.appendChild(document.createElement('span'));
    inner.appendChild(brand);inner.appendChild(menu);inner.appendChild(dots);nav.appendChild(inner);document.body.appendChild(nav);
  }

  function unlockArtmugDetail() {
    var box = document.querySelector('.detailinfo');
    if (box) { box.classList.remove('showstep1'); box.style.maxHeight = 'none'; box.style.overflow = 'visible'; }
    var content = document.querySelector('.detailinfo .showcontent');
    if (content) { content.style.maxHeight = 'none'; content.style.overflow = 'visible'; }
    document.querySelectorAll('.btn_open_btn,.btn_open,.btn_close').forEach(function (node) { node.remove(); });
  }
  function decorateArtmugParent() {
    if (document.body) document.body.classList.add('khaki30-artmug-theme');
    var detail = document.getElementById('detailViews');
    if (detail) detail.classList.add('khaki30-detail-zone');
  }

  function setIframeHeight(height) {
    var iframe = getIframe();
    if (!iframe) return;
    var raw = Math.ceil(Number(height) || 0); if (!raw) return;
    var next = Math.max(700, raw); if (lastHeight && Math.abs(next - lastHeight) < 2) return;
    iframe.style.height = next + 'px'; iframe.style.minHeight = next + 'px'; iframe.style.maxHeight = 'none'; iframe.style.overflow = 'hidden';
    iframe.height = String(next); iframe.setAttribute('height', String(next)); iframe.setAttribute('scrolling', 'no'); lastHeight = next; sendViewport();
  }

  function scrollParentTo(targetY) {
    var iframe = getIframe(); if (!iframe) return;
    var iframeTop = getPageScrollY() + iframe.getBoundingClientRect().top;
    window.scrollTo({ top: Math.max(0, iframeTop + Number(targetY || 0) - 18), behavior: 'smooth' });
    [80, 300, 800].forEach(function (ms) { setTimeout(sendViewport, ms); });
  }

  function bindMessages() {
    if (window.__khaki30ArtmugMessageBindV20) return;
    window.__khaki30ArtmugMessageBindV20 = true;
    window.addEventListener('message', function (event) {
      var iframe = getIframe(); if (!iframe || event.source !== iframe.contentWindow || event.origin !== getIframeOrigin(iframe)) return;
      var data = event.data || {};
      var validSource = data.source === 'syura-css';
      var heightMessage = data.type === 'SYURA_IFRAME_HEIGHT' || data.type === 'SIWOL_IFRAME_HEIGHT';
      if (!validSource && !heightMessage) return;
      if (heightMessage) setIframeHeight(data.height);
      if (data.type === 'SYURA_IFRAME_READY') [50,200,600,1200].forEach(function (ms) { setTimeout(sendViewport, ms); });
      if (data.type === 'SYURA_PARENT_SCROLL_TO') scrollParentTo(data.targetY);
    });
    window.addEventListener('scroll', sendViewport, { passive: true });
    window.addEventListener('resize', sendViewport);
  }

  function prepareIframe() {
    var iframe = getIframe(); if (!iframe) return false;
    if (iframe.src && iframe.src.indexOf(IFRAME_PATH) < 0 && !iframe.hasAttribute('data-khaki30-artmug') && !iframe.closest('section[name="am-root"]')) return false;
    iframe.dataset.khaki30ParentBound = '1';
    iframe.style.width = '100%';
    iframe.style.height = Math.max(Number(iframe.getAttribute('height')) || 700, lastHeight || 700) + 'px';
    iframe.style.maxWidth = '1180px';
    iframe.style.border = '0'; iframe.style.overflow = 'hidden'; iframe.setAttribute('scrolling', 'no');
    if (!iframe.dataset.khaki30LoadBound) {
      iframe.dataset.khaki30LoadBound = '1';
      iframe.addEventListener('load', function () { [80,250,700,1500].forEach(function (ms) { setTimeout(sendViewport, ms); }); });
    }
    sendViewport(); return true;
  }

  function neutralize() {
    injectStyle(); unlockArtmugDetail(); decorateArtmugParent(); bindMessages();
    if (!document.querySelector('.khaki30-floating-nav')) buildNav();
    prepareIframe();
  }

  function watch() {
    if (window.__khaki30ArtmugWatchV20) return;
    window.__khaki30ArtmugWatchV20 = true;
    var observer = new MutationObserver(function (mutations) {
      var onlyOwn = mutations.every(function (mutation) {
        return mutation.target && mutation.target.closest && mutation.target.closest('.khaki30-floating-nav');
      });
      if (onlyOwn) return;
      clearTimeout(retryTimer); retryTimer = setTimeout(neutralize, 80);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    var count = 0;
    var timer = setInterval(function () { count += 1; neutralize(); if (count > 20) clearInterval(timer); }, 700);
  }

  function boot() {
    neutralize(); watch();
    [300,1000,2000,4000].forEach(function (ms) { setTimeout(neutralize, ms); });
  }

  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
