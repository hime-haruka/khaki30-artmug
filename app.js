(function () {
  'use strict';

  var SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQegaIJ_GbYBF-DxvnHysVCQqO2aVqZLGM2UpYzsvTUXRwY2ao_cOL7Uj1W7Q2VgruESLW0ReDicMRw/pub';
  var META_GID = '0';
  var PRICE_META_GID = '191264487';
  var SPECIAL_ITEM_NAMES = ['전용 의상', '전용 헤어', '전용 악세서리', '비전용 의상', '비전용 헤어', '비전용 악세서리'];
  var FALLBACK_META = [
    { order: '1', id: 'intro', title: '', subtitle: '', desc: '', gid: '235383793', visible: 'TRUE' },
    { order: '2', id: 'calendar', title: '캘린더', subtitle: 'Calendar', desc: '작업 현황을 확인하실 수 있습니다.', gid: '1116413674', visible: 'TRUE' },
    { order: '3', id: 'process', title: '작업 과정', subtitle: 'Work Process', desc: '작업 과정을 한 눈에 확인하실 수 있습니다.', gid: '812996073', visible: 'TRUE' },
    { order: '4', id: 'notice', title: '안내 사항', subtitle: 'Notice', desc: '작업 전 안내사항을 꼭 확인해주세요.', gid: '1997198423', visible: 'TRUE' },
    { order: '5', id: 'price', title: '가격표 / 옵션', subtitle: 'Pricing & Options', desc: '추가 옵션 및 가격을 확인하실 수 있습니다.', gid: '1932657160', visible: 'TRUE' },
    { order: '6', id: 'portfolio', title: '포트폴리오', subtitle: 'Portfolio', desc: '다양한 작업물과 샘플을 확인하실 수 있습니다.', gid: '2110502187', visible: 'TRUE' },
    { order: '8', id: 'form', title: '신청 양식', subtitle: 'Commission Form', desc: '작업 내용을 작성하신 후 복사한 양식으로 문의하실 수 있습니다.', gid: '', visible: 'TRUE' }
  ];
  var FALLBACK_PRICE_META = [
    { type: 'main', t_order: '1', title: '기본 작업', subtitle: 'Base Price' },
    { type: 'add-on', t_order: '2', title: '추가 옵션', subtitle: 'Add-ons' },
    { type: 'warudo', t_order: '3', title: '와루도', subtitle: 'Warudo' },
    { type: 'VRC', t_order: '4', title: 'VRC', subtitle: 'VRChat' },
    { type: 'etc', t_order: '5', title: '기타', subtitle: 'ETC' }
  ];
  var state = {
    meta: [],
    sheets: {},
    priceRows: [],
    priceMeta: [],
    heightTimer: null,
    toastTimer: null,
    parentViewport: null,
    motionBound: false,
    motionTicking: false,
    revealItems: []
  };

  function csvUrl(gid) {
    return SHEET_BASE + '?gid=' + encodeURIComponent(gid) + '&single=true&output=csv&_=' + Date.now();
  }

  function parseCSV(text) {
    var source = String(text || '').replace(/^\uFEFF/, '');
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    for (var i = 0; i < source.length; i += 1) {
      var ch = source[i];
      if (quoted) {
        if (ch === '"') {
          if (source[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            quoted = false;
          }
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
    if (cell.length || row.length) {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
    }
    if (!rows.length) return [];
    var headers = rows.shift().map(function (header) { return clean(header); });
    return rows.filter(function (cells) {
      return cells.some(function (value) { return clean(value) !== ''; });
    }).map(function (cells) {
      var item = {};
      headers.forEach(function (header, index) {
        if (header) item[header] = clean(cells[index] || '');
      });
      return item;
    });
  }

  function clean(value) {
    var text = String(value == null ? '' : value).trim();
    if (text === '<br>' || text === '<br/>' || text === '<br />') return '';
    return text;
  }

  function fetchCSV(gid) {
    return fetch(csvUrl(gid), { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('CSV load failed: ' + response.status);
      return response.text();
    }).then(parseCSV);
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function richText(value) {
    return escapeHTML(value)
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  function numberValue(value) {
    return Number(String(value || '').replace(/[^\d.-]/g, '')) || 0;
  }

  function money(value) {
    var amount = Math.round(Number(value) || 0);
    return amount.toLocaleString('ko-KR') + '원';
  }

  function honorificName(value) {
    var text = String(value || '').trim();
    if (!text) return 'Untitled';
    return /님$/.test(text) ? text : text + '님';
  }

  function formatDate(value) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value || '-';
    return match[1] + '.' + match[2] + '.' + match[3];
  }

  function toDate(value, endOfDay) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, 0);
  }

  function isTrue(value) {
    return /^(true|1|yes|y)$/i.test(String(value || '').trim());
  }

  function setSectionMeta() {
    state.meta.forEach(function (meta) {
      var section = document.getElementById(meta.id);
      if (!section) return;
      section.hidden = !isTrue(meta.visible);
      if (meta.id === 'intro') return;
      var title = section.querySelector('.section-heading h2');
      var kicker = section.querySelector('.section-kicker');
      var desc = section.querySelector('.section-heading > p');
      if (title && meta.title) title.textContent = meta.title;
      if (kicker && meta.subtitle) kicker.textContent = meta.subtitle;
      if (desc && meta.desc) desc.textContent = meta.desc;
    });
  }

  function sectionError(id, selector, message) {
    var section = document.getElementById(id);
    if (section) section.classList.remove('section-loading');
    var box = section ? section.querySelector(selector) : null;
    if (box) {
      box.classList.remove('skeleton-block');
      box.innerHTML = '<div class="error-state">' + escapeHTML(message) + '</div>';
    }
    queueHeight();
  }

  function renderIntro(rows) {
    var section = document.getElementById('intro');
    var profile = section.querySelector('.hero-profile');
    var visual = section.querySelector('.hero-visual');
    var item = rows[0];
    section.classList.remove('section-loading');
    profile.classList.remove('skeleton-block');
    visual.classList.remove('skeleton-block');
    if (!item) {
      profile.innerHTML = '<div class="empty-state">작가 소개 데이터가 없습니다.</div>';
      queueHeight();
      return;
    }
    profile.innerHTML = '<div class="profile-name"><strong>' + escapeHTML(item.name || 'KHAKI30') + '</strong><span>' + escapeHTML(item.sub || '카키 30') + '</span></div><p class="profile-desc">' + richText(item.desc || '') + '</p>';
    if (item.image) {
      visual.innerHTML = '<img src="' + escapeHTML(item.image) + '" alt="' + escapeHTML(item.name || 'KHAKI30') + ' 대표 이미지" loading="eager">';
      bindImageFallback(visual.querySelector('img'), visual);
    }
    queueHeight();
  }

  function statusClass(type) {
    var text = String(type || '');
    if (/휴무|마감/.test(text)) return 'is-break';
    if (/작업|진행/.test(text)) return 'is-busy';
    return '';
  }

  function renderCalendar(rows) {
    var section = document.getElementById('calendar');
    var summary = section.querySelector('.reservation-summary');
    var board = section.querySelector('.calendar-board');
    section.classList.remove('section-loading');
    summary.classList.remove('skeleton-block');
    board.classList.remove('skeleton-block');
    if (!rows.length) {
      summary.innerHTML = '<div class="empty-state">등록된 일정이 없습니다.</div>';
      board.innerHTML = '';
      queueHeight();
      return;
    }

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var normalized = rows.map(function (row, index) {
      var start = toDate(row.start_date, false);
      var end = toDate(row.end_date, true);
      return {
        id: 'schedule-' + index,
        title: row.title || row.type || '일정',
        type: row.type || '',
        desc: row.desc || '',
        start: start,
        end: end,
        raw: row
      };
    }).filter(function (row) {
      return row.start && row.end;
    }).sort(function (a, b) {
      return a.start - b.start || a.end - b.end;
    });

    function dayOnly(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function addDays(date, amount) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
    }

    function diffDays(start, end) {
      return Math.round((dayOnly(end) - dayOnly(start)) / 86400000);
    }

    function overlaps(startA, endA, startB, endB) {
      return startA <= endB && endA >= startB;
    }

    function sameDay(a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }

    function formatCalendarDate(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) return '-';
      var year = date.getFullYear();
      var month = String(date.getMonth() + 1).padStart(2, '0');
      var day = String(date.getDate()).padStart(2, '0');
      return year + '.' + month + '.' + day;
    }

    function formatRange(start, end) {
      if (!(start instanceof Date) || isNaN(start.getTime())) return '-';
      if (!(end instanceof Date) || isNaN(end.getTime())) return formatCalendarDate(start);
      if (sameDay(start, end)) return formatCalendarDate(start);
      return formatCalendarDate(start) + ' ~ ' + formatCalendarDate(end);
    }

    var active = normalized.filter(function (row) {
      return overlaps(row.start, row.end, today, today);
    });
    var upcoming = normalized.filter(function (row) {
      return row.start > today;
    }).sort(function (a, b) {
      return a.start - b.start;
    });

    var currentCard = active[0] ? {
      label: 'CURRENT',
      title: active[0].title,
      desc: formatRange(active[0].start, active[0].end),
      className: statusClass(active[0].type)
    } : {
      label: 'CURRENT',
      title: '상담 가능',
      desc: '현재 진행 중인 일정이 없습니다.',
      className: ''
    };

    var nextCard = upcoming[0] ? {
      label: 'NEXT',
      title: upcoming[0].title,
      desc: formatRange(upcoming[0].start, upcoming[0].end),
      className: statusClass(upcoming[0].type)
    } : {
      label: 'NEXT',
      title: '다음 일정 미정',
      desc: '새로운 일정이 등록되면 자동으로 반영됩니다.',
      className: ''
    };

    var guideCard = {
      label: 'GUIDE',
      title: '일정은 상담 상황에 따라 변동될 수 있습니다.',
      desc: '정확한 마감 일정은 상담 후 안내드립니다.',
      className: 'is-break'
    };

    summary.innerHTML = [currentCard, nextCard, guideCard].map(function (card) {
      return '<article class="status-card ' + card.className + '"><small>' + escapeHTML(card.label) + '</small><strong>' + escapeHTML(card.title) + '</strong><p>' + escapeHTML(card.desc) + '</p></article>';
    }).join('');

    var cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    var weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    function buildEventSegments(weekStart, weekEnd, month) {
      var laneEnd = [];
      var segments = [];
      normalized.forEach(function (event) {
        if (!overlaps(event.start, event.end, weekStart, weekEnd)) return;
        var segStart = event.start > weekStart ? dayOnly(event.start) : dayOnly(weekStart);
        var segEnd = event.end < weekEnd ? dayOnly(event.end) : dayOnly(weekEnd);
        var chunkStart = segStart;
        var prevOutside = chunkStart.getMonth() !== month;
        for (var cursorDay = addDays(segStart, 1); cursorDay <= segEnd; cursorDay = addDays(cursorDay, 1)) {
          var isOutside = cursorDay.getMonth() !== month;
          if (isOutside !== prevOutside) {
            segments.push(makeSegment(event, weekStart, chunkStart, addDays(cursorDay, -1), prevOutside));
            chunkStart = dayOnly(cursorDay);
            prevOutside = isOutside;
          }
        }
        segments.push(makeSegment(event, weekStart, chunkStart, segEnd, prevOutside));
      });

      function makeSegment(event, baseWeekStart, startDate, endDate, isOutsideMonth) {
        var startIndex = diffDays(baseWeekStart, startDate);
        var endIndex = diffDays(baseWeekStart, endDate);
        var lane = 0;
        while (laneEnd[lane] != null && laneEnd[lane] >= startIndex) lane += 1;
        laneEnd[lane] = endIndex;
        return {
          event: event,
          startIndex: startIndex,
          endIndex: endIndex,
          span: endIndex - startIndex + 1,
          lane: lane,
          outside: isOutsideMonth,
          label: event.title || event.type || '일정'
        };
      }

      return {
        laneCount: Math.max(1, laneEnd.length),
        segments: segments
      };
    }

    function barHTML(segment) {
      var event = segment.event;
      var cls = ['calendar-span'];
      var status = statusClass(event.type);
      if (status) cls.push(status);
      if (segment.outside) cls.push('is-outside-range');
      return '<button type="button" class="' + cls.join(' ') + '" style="grid-column:' + (segment.startIndex + 1) + ' / span ' + segment.span + ';grid-row:' + (segment.lane + 1) + ';" data-title="' + escapeHTML(event.title) + '" data-type="' + escapeHTML(event.type || '') + '" data-dates="' + escapeHTML(formatRange(event.start, event.end)) + '" data-desc="' + escapeHTML(event.desc || '') + '"><span>' + escapeHTML(segment.label) + '</span></button>';
    }

    function drawCalendar() {
      var year = cursor.getFullYear();
      var month = cursor.getMonth();
      var first = new Date(year, month, 1);
      var gridStart = new Date(year, month, 1 - first.getDay());
      var weekRows = [];

      for (var week = 0; week < 6; week += 1) {
        var weekStart = addDays(gridStart, week * 7);
        var weekEnd = addDays(weekStart, 6);
        var layout = buildEventSegments(weekStart, weekEnd, month);
        var dayCells = [];
        for (var day = 0; day < 7; day += 1) {
          var date = addDays(weekStart, day);
          var classes = ['calendar-day'];
          if (date.getMonth() !== month) classes.push('is-outside');
          if (sameDay(date, today)) classes.push('is-today');
          dayCells.push('<div class="' + classes.join(' ') + '"><div class="calendar-date-number">' + date.getDate() + '</div></div>');
        }
        weekRows.push('<div class="calendar-week-row" style="--event-lanes:' + layout.laneCount + ';"><div class="calendar-days">' + dayCells.join('') + '</div><div class="calendar-week-bars">' + layout.segments.map(barHTML).join('') + '</div></div>');
      }

      board.innerHTML = '<div class="calendar-shell">' +
        '<div class="calendar-toolbar"><button type="button" class="calendar-nav" data-calendar-move="-1" aria-label="이전 달"><i class="bi bi-chevron-left"></i></button>' +
        '<div class="calendar-month"><small>' + year + '</small><strong>' + (month + 1) + '월</strong></div>' +
        '<button type="button" class="calendar-nav" data-calendar-move="1" aria-label="다음 달"><i class="bi bi-chevron-right"></i></button></div>' +
        '<div class="calendar-scroll"><div class="calendar-inner"><div class="calendar-weekdays">' + weekdays.map(function (day, index) { return '<div class="' + (index === 0 ? 'is-sunday' : index === 6 ? 'is-saturday' : '') + '">' + day + '</div>'; }).join('') + '</div>' +
        '<div class="calendar-grid-v2">' + weekRows.join('') + '</div></div></div>' +
        '<div class="calendar-legend"><span><i class="legend-dot is-busy"></i>작업중</span><span><i class="legend-dot is-break"></i>휴무/마감</span><span><i class="legend-dot"></i>기타 일정</span><span><i class="legend-dot is-outside"></i>이전/다음 달 일정</span></div>' +
        '<div class="calendar-tooltip" hidden><strong></strong><small></small><p></p></div>' +
        '</div>';
      queueHeight();
    }

    if (!board.dataset.calendarBound) {
      board.dataset.calendarBound = '1';
      board.addEventListener('click', function (event) {
        var button = event.target.closest('[data-calendar-move]');
        if (!button) return;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + numberValue(button.getAttribute('data-calendar-move')), 1);
        drawCalendar();
      });

      var tooltip = null;
      function hideTooltip() {
        if (!tooltip || !tooltip.isConnected) tooltip = board.querySelector('.calendar-tooltip');
        if (!tooltip) return;
        tooltip.hidden = true;
      }

      function showTooltip(target, clientX, clientY) {
        if (!tooltip || !tooltip.isConnected) tooltip = board.querySelector('.calendar-tooltip');
        if (!tooltip || !target) return;
        tooltip.querySelector('strong').textContent = target.getAttribute('data-title') || target.textContent || '일정';
        var type = target.getAttribute('data-type') || '';
        var dates = target.getAttribute('data-dates') || '';
        tooltip.querySelector('small').textContent = [type, dates].filter(Boolean).join(' · ');
        tooltip.querySelector('p').textContent = target.getAttribute('data-desc') || '등록된 상세 일정입니다.';
        tooltip.hidden = false;
        var rect = board.getBoundingClientRect();
        var tipRect = tooltip.getBoundingClientRect();
        var x = (typeof clientX === 'number' ? clientX - rect.left : target.getBoundingClientRect().left - rect.left + target.offsetWidth / 2) - tipRect.width / 2;
        var y = (typeof clientY === 'number' ? clientY - rect.top : target.getBoundingClientRect().top - rect.top) - tipRect.height - 14;
        x = Math.max(10, Math.min(rect.width - tipRect.width - 10, x));
        if (y < 8) y = (target.getBoundingClientRect().bottom - rect.top) + 12;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
      }

      board.addEventListener('mouseover', function (event) {
        var target = event.target.closest('.calendar-span');
        if (!target) return;
        showTooltip(target, event.clientX, event.clientY);
      });
      board.addEventListener('mouseout', function (event) {
        var target = event.target.closest('.calendar-span');
        if (!target) return;
        if (event.relatedTarget && target.contains(event.relatedTarget)) return;
        hideTooltip();
      });
      board.addEventListener('focusin', function (event) {
        var target = event.target.closest('.calendar-span');
        if (!target) return;
        showTooltip(target);
      });
      board.addEventListener('focusout', function (event) {
        if (event.target.closest('.calendar-span')) hideTooltip();
      });
    }

    drawCalendar();
  }

  function processIcon(icon) {
    var match = String(icon || '').match(/bi\s+(bi-[a-z0-9-]+)/i);
    return match ? '<i class="bi ' + match[1] + '"></i>' : '<i class="bi bi-check2"></i>';
  }

  function processDescription(content) {
    var text = String(content || '');
    if (/문의/.test(text)) return '작업 내용과 참고 자료를 전달해 주세요.';
    if (/헤드/.test(text)) return '요청 내용을 바탕으로 헤드 작업을 진행합니다.';
    if (/페이셜/.test(text)) return '표정과 움직임을 자연스럽게 세팅합니다.';
    if (/표정/.test(text)) return '요청된 표정 요소를 제작하고 적용합니다.';
    if (/뚜따|의상|헤어/.test(text)) return '의상·헤어·소품을 요청에 맞게 적용합니다.';
    if (/컨펌|확인/.test(text)) return '진행 결과를 확인하고 필요한 부분을 조정합니다.';
    if (/전달|완료/.test(text)) return '최종 확인 후 완성 파일을 전달합니다.';
    return '순서에 맞춰 작업을 진행합니다.';
  }

  function renderProcess(rows) {
    var section = document.getElementById('process');
    var box = section.querySelector('.process-list');
    section.classList.remove('section-loading');
    box.classList.remove('skeleton-block');
    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">등록된 작업 순서가 없습니다.</div>';
      queueHeight();
      return;
    }
    var sorted = rows.slice().sort(function (a, b) { return numberValue(a.step) - numberValue(b.step); });
    box.innerHTML = sorted.map(function (row, index) {
      return '<article class="process-step"><div class="process-icon">' + processIcon(row.icon) + '</div><div class="process-copy"><small>' + String(index + 1).padStart(2, '0') + '</small><strong>' + escapeHTML(row.content || '') + '</strong><p>' + escapeHTML(row.desc || processDescription(row.content)) + '</p></div></article>';
    }).join('');
    queueHeight();
  }

  function noticeIcon(index) {
    var icons = ['bi-bag-check', 'bi-box-seam', 'bi-layers', 'bi-info-circle', 'bi-file-earmark-check', 'bi-stars'];
    return icons[index % icons.length];
  }

  function renderNotice(rows) {
    var section = document.getElementById('notice');
    var box = section.querySelector('.notice-grid');
    section.classList.remove('section-loading');
    box.classList.remove('skeleton-block');
    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">등록된 안내사항이 없습니다.</div>';
      queueHeight();
      return;
    }
    var grouped = {};
    rows.forEach(function (row) {
      var category = row.category || '안내';
      if (!grouped[category]) grouped[category] = { order: numberValue(row.c_order), rows: [] };
      grouped[category].rows.push(row);
    });
    var groups = Object.keys(grouped).map(function (category) {
      return { category: category, order: grouped[category].order, rows: grouped[category].rows };
    }).sort(function (a, b) { return a.order - b.order; });
    box.innerHTML = groups.map(function (group, groupIndex) {
      var items = group.rows.slice().sort(function (a, b) { return numberValue(a.order) - numberValue(b.order); }).map(function (row) {
        return '<li>' + richText(row.content || '') + '</li>';
      }).join('');
      var denseClass = group.rows.length >= 4 ? ' notice-card--dense' : '';
      return '<article class="notice-card' + denseClass + '"><div class="notice-title"><i class="bi ' + noticeIcon(groupIndex) + '"></i><span>' + escapeHTML(group.category) + '</span></div><ol>' + items + '</ol></article>';
    }).join('');
    queueHeight();
  }

  function calcBadge(calcType) {
    var type = String(calcType || '').toLowerCase();
    if (type === 'unit') return '개당';
    if (type === 'discount' || type === 'discount-percent') return '할인';
    return '';
  }

  function priceNameHTML(name) {
    var raw = String(name || '').trim();
    var match = raw.match(/^\-([^\-]+)\-\s*(.*)$/);
    if (!match) return '<strong>' + escapeHTML(raw) + '</strong>';
    var fixed = match[1].trim();
    var detail = match[2].trim().replace(/^\((.*)\)$/, '$1');
    return '<span class="price-name-fixed">' + escapeHTML(fixed) + '</span>' + (detail ? '<strong>' + escapeHTML(detail) + '</strong>' : '');
  }

  function priceDisplay(row) {
    var type = String(row.calc_type || 'add').toLowerCase();
    var price = numberValue(row.price);
    if (type === 'discount' || type === 'discount-percent') return '-' + money(Math.abs(price));
    return money(price);
  }

  function renderPrice(rows, metaRows) {
    var section = document.getElementById('price');
    var box = section.querySelector('.price-groups');
    section.classList.remove('section-loading');
    box.classList.remove('skeleton-block');
    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">등록된 가격 정보가 없습니다.</div>';
      queueHeight();
      return;
    }
    var grouped = {};
    rows.forEach(function (row) {
      if (!grouped[row.type]) grouped[row.type] = [];
      grouped[row.type].push(row);
    });
    var metas = metaRows.filter(function (meta) { return grouped[meta.type] && grouped[meta.type].length; });
    Object.keys(grouped).forEach(function (type) {
      if (!metas.some(function (meta) { return meta.type === type; })) metas.push({ type: type, t_order: '99', title: type, subtitle: '' });
    });
    metas.sort(function (a, b) { return numberValue(a.t_order) - numberValue(b.t_order); });
    box.innerHTML = '<div class="price-sections">' + metas.map(function (meta) {
      var list = grouped[meta.type] || [];
      var items = list.map(function (row) {
        var badge = calcBadge(row.calc_type);
        return '<div class="price-row"><div class="price-name">' + priceNameHTML(row.name || '') + (badge ? '<span class="price-badge">' + escapeHTML(badge) + '</span>' : '') + '</div><div class="price-desc">' + richText(row.desc || '') + '</div><div class="price-amount">' + escapeHTML(priceDisplay(row)) + '</div></div>';
      }).join('');
      return '<section class="price-group-block"><div class="price-panel-head"><div><h3>' + escapeHTML(meta.title || meta.type) + '</h3><span>' + escapeHTML(meta.subtitle || '') + '</span></div><div class="price-group-count">' + list.length + ' ITEMS</div></div><div class="price-table">' + items + '</div></section>';
    }).join('') + '</div>';
    queueHeight();
  }

  function driveImage(url) {
    var source = String(url || '').trim();
    var fileMatch = source.match(/\/file\/d\/([^/]+)/);
    var idMatch = source.match(/[?&]id=([^&]+)/);
    var id = fileMatch ? fileMatch[1] : (idMatch ? idMatch[1] : '');
    return id ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600' : source;
  }

  function bindImageFallback(img, container) {
    if (!img) return;
    img.addEventListener('error', function () {
      if (container) container.classList.add('is-broken');
      img.removeAttribute('src');
      queueHeight();
    }, { once: true });
  }

  function renderPortfolio(rows) {
    var section = document.getElementById('portfolio');
    var box = section.querySelector('.portfolio-grid');
    section.classList.remove('section-loading');
    box.classList.remove('skeleton-block');
    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">등록된 포트폴리오가 없습니다.</div>';
      queueHeight();
      return;
    }
    var sorted = rows.slice().sort(function (a, b) { return numberValue(a.order) - numberValue(b.order); });
    box.innerHTML = sorted.map(function (row, index) {
      var image = driveImage(row.image_url);
      return '<article class="portfolio-card"><div class="portfolio-image" data-lightbox-index="' + index + '"><img src="' + escapeHTML(image) + '" alt="' + escapeHTML(row.name || '포트폴리오') + '" loading="lazy"></div><div class="portfolio-info"><strong>' + escapeHTML(honorificName(row.name || 'Untitled')) + '</strong><p>' + richText(row.desc || '') + '</p><small>' + richText(row.aritist || row.artist || '') + '</small></div></article>';
    }).join('');
    box.querySelectorAll('.portfolio-image img').forEach(function (img) { bindImageFallback(img, img.closest('.portfolio-image')); });
    box.addEventListener('click', function (event) {
      var target = event.target.closest('.portfolio-image');
      if (!target || target.classList.contains('is-broken')) return;
      var img = target.querySelector('img');
      if (img && img.src) openLightbox(img.src, img.alt);
    });
    queueHeight();
  }

  function typeMeta(type) {
    var found = state.priceMeta.find(function (meta) { return meta.type === type; });
    return found || { title: type, subtitle: '' };
  }

  function rowKey(row) {
    return row._key;
  }

  function optionPriceLabel(row) {
    var badge = calcBadge(row.calc_type);
    return priceDisplay(row) + (badge ? ' · ' + badge : '');
  }

  function isBaseRow(row) {
    return row.type === 'main' && (/일러스트\s*기반\s*성형/.test(row.name) || /오리지널\s*헤드/.test(row.name));
  }

  function isCopyrightRow(row) {
    return /오리지널\s*헤드\s*저작권/.test(row.name || '');
  }

  function optionControl(row) {
    var key = rowKey(row);
    var type = String(row.calc_type || 'add').toLowerCase();
    var copy = '<div class="option-copy option-copy--named">' + priceNameHTML(row.name || '') + '<small class="option-price">' + escapeHTML(optionPriceLabel(row)) + '</small></div>';
    if (type === 'unit') {
      return '<div class="counter-row">' + copy + '<div class="counter"><button type="button" data-counter-minus="' + key + '" aria-label="수량 줄이기">−</button><input type="number" min="0" step="1" value="0" inputmode="numeric" data-price-key="' + key + '" data-price-kind="unit" aria-label="' + escapeHTML(row.name || '') + ' 수량"><button type="button" data-counter-plus="' + key + '" aria-label="수량 늘리기">+</button></div></div>';
    }
    return '<div class="toggle-row">' + copy + '<label class="switch"><input type="checkbox" data-price-key="' + key + '" data-price-kind="toggle"><span></span></label></div>';
  }

  function renderForm(rows) {
    var section = document.getElementById('form');
    var form = document.getElementById('commissionForm');
    var card = form.querySelector('.form-card');
    var quote = section.querySelector('.quote-panel');
    section.classList.remove('section-loading');
    card.classList.remove('skeleton-block');
    quote.classList.remove('skeleton-block');
    if (!rows.length) {
      card.innerHTML = '<div class="error-state">가격표를 불러오지 못해 신청 양식을 생성할 수 없습니다.</div>';
      quote.innerHTML = '<h3>예상 견적</h3><p>가격표 연결을 확인한 뒤 선택 항목을 자동 계산합니다.</p><div class="quote-lines"><div class="quote-empty">가격표 데이터를 불러오지 못했습니다.</div></div><div class="quote-total"><span>ESTIMATED TOTAL</span><strong>0원</strong></div><div class="quote-note">시트 연결이 복구되면 최신 가격표를 기준으로 자동 계산됩니다.</div>';
      queueHeight();
      setTimeout(updateFloatingQuote, 0);
      return;
    }
    var baseRows = rows.filter(isBaseRow);
    var specialRows = rows.filter(function (row) { return SPECIAL_ITEM_NAMES.indexOf(row.name) >= 0; });
    var specialExclusive = specialRows.filter(function (row) { return /^전용\s/.test(row.name); });
    var specialNonExclusive = specialRows.filter(function (row) { return /^비전용\s/.test(row.name); });
    var excluded = {};
    baseRows.concat(specialRows).forEach(function (row) { excluded[rowKey(row)] = true; });
    var remaining = rows.filter(function (row) { return !excluded[rowKey(row)]; });
    var copyrightRows = remaining.filter(isCopyrightRow);
    remaining = remaining.filter(function (row) { return !isCopyrightRow(row); });
    var grouped = {};
    remaining.forEach(function (row) {
      if (!grouped[row.type]) grouped[row.type] = [];
      grouped[row.type].push(row);
    });
    var baseChoices = baseRows.map(function (row) {
      return '<div class="choice-card"><input type="radio" name="base_work" id="base_' + rowKey(row) + '" value="' + rowKey(row) + '"><label for="base_' + rowKey(row) + '"><strong>' + escapeHTML(row.name) + '</strong><span>' + escapeHTML(priceDisplay(row)) + '</span></label></div>';
    }).join('');
    var specialHtml = '';
    if (specialRows.length) {
      specialHtml = '<div class="form-group form-group--special"><div class="form-group-title"><h3>의상 · 헤어 · 악세서리</h3><span>전용 / 비전용 수량을 각각 입력</span></div><div class="item-options"><div class="item-block"><h4>전용 아이템</h4>' + (specialExclusive.map(optionControl).join('') || '<div class="quote-empty">등록된 옵션 없음</div>') + '</div><div class="item-block"><h4>비전용 아이템</h4>' + (specialNonExclusive.map(optionControl).join('') || '<div class="quote-empty">등록된 옵션 없음</div>') + '</div></div></div>';
    }
    var categoryOrder = state.priceMeta.map(function (meta) { return meta.type; });
    Object.keys(grouped).forEach(function (type) { if (categoryOrder.indexOf(type) < 0) categoryOrder.push(type); });
    var otherGroups = categoryOrder.filter(function (type) { return grouped[type] && grouped[type].length; }).map(function (type) {
      var meta = typeMeta(type);
      return '<div class="form-group form-group--options"><div class="form-group-title"><h3>' + escapeHTML(meta.title || type) + '</h3><span>' + escapeHTML(meta.subtitle || '') + '</span></div><div class="item-options">' + grouped[type].map(function (row) { return '<div class="item-block">' + optionControl(row) + '</div>'; }).join('') + '</div></div>';
    }).join('');
    var copyrightHtml = copyrightRows.length ? '<div class="form-group form-group--options conditional-copyright" hidden><div class="form-group-title"><h3>오리지널 헤드 저작권</h3><span>오리지널 헤드 신청자 전용</span></div><div class="item-options">' + copyrightRows.map(function (row) { return '<div class="item-block">' + optionControl(row) + '</div>'; }).join('') + '</div></div>' : '';
    card.innerHTML = '<div class="form-group form-group--basic"><div class="form-group-title"><h3>기본 정보</h3><span>필수 항목부터 입력해 주세요.</span></div><div class="field-grid"><div class="field"><label for="nickname">닉네임</label><input id="nickname" name="nickname" type="text" placeholder="닉네임을 입력해 주세요."></div><div class="field"><label for="platform">방송 플랫폼</label><input id="platform" name="platform" type="text" placeholder="치지직, SOOP, YouTube 등"></div><div class="field field-full"><span class="field-label">사용 용도</span><div class="choice-grid"><div class="choice-card"><input type="radio" name="usage" id="usage_personal" value="개인용(비상업용)"><label for="usage_personal"><strong>개인용</strong><span>비상업용</span></label></div><div class="choice-card"><input type="radio" name="usage" id="usage_stream" value="방송용"><label for="usage_stream"><strong>방송용</strong><span>스트리밍 사용</span></label></div></div></div></div></div><div class="form-group form-group--base"><div class="form-group-title"><h3>기본 작업 선택</h3><span>일러스트 기반 성형 / 오리지널 헤드</span></div><div class="choice-grid">' + baseChoices + '</div></div>' + copyrightHtml + specialHtml + otherGroups + '<div class="form-group form-group--materials"><div class="form-group-title"><h3>작업 자료 · 문의사항</h3><span>링크는 줄바꿈으로 여러 개 입력 가능</span></div><div class="field-grid"><div class="field"><label for="baseAvatar">베이스 아바타</label><input id="baseAvatar" name="baseAvatar" type="text" placeholder="아바타명 또는 링크"></div><div class="field"><label for="boothItems">BOOTH 아이템 링크</label><textarea id="boothItems" name="boothItems" placeholder="의상, 헤어, 악세서리 링크를 입력해 주세요."></textarea></div><div class="field field-full"><label for="message">기타 문의사항</label><textarea id="message" name="message" placeholder="원하시는 작업 방향이나 참고사항을 자유롭게 적어 주세요."></textarea></div></div></div>';
    quote.innerHTML = '<h3>예상 견적</h3><p>선택한 항목을 기준으로 자동 계산됩니다.</p><div class="quote-lines"></div><div class="quote-total"><span>ESTIMATED TOTAL</span><strong>0원</strong></div><div class="quote-note">실제 견적은 작업 난이도와 자료 확인 후 달라질 수 있습니다.</div><div class="form-actions"><button type="button" class="btn-primary" id="copyForm"><i class="bi bi-copy"></i> 신청 양식 복사</button><button type="reset" class="btn-secondary">초기화</button></div>';
    quote.classList.remove('will-reveal');
    quote.classList.add('is-inview');
    bindFormEvents(form, quote);
    updateQuote(form, quote);
    queueHeight();
    setTimeout(updateFloatingQuote, 0);
  }

  function selectedRowValue(form, row) {
    if (isBaseRow(row)) {
      var selectedBase = form.querySelector('input[name="base_work"]:checked');
      return selectedBase && selectedBase.value === rowKey(row) ? 1 : 0;
    }
    var control = form.querySelector('[data-price-key="' + rowKey(row) + '"]');
    if (!control) return 0;
    if (control.type === 'checkbox') return control.checked ? 1 : 0;
    return Math.max(0, Math.floor(numberValue(control.value)));
  }

  function calculate(form) {
    var lines = [];
    var subtotal = 0;
    state.priceRows.forEach(function (row) {
      var count = selectedRowValue(form, row);
      if (!count) return;
      var calcType = String(row.calc_type || 'add').toLowerCase();
      var price = numberValue(row.price);
      var amount = 0;
      if (calcType === 'unit') amount = price * count;
      else if (calcType === 'discount' || calcType === 'discount-percent') amount = -Math.abs(price);
      else amount = price;
      subtotal += amount;
      lines.push({ row: row, count: count, amount: amount, discount: amount < 0 || calcType.indexOf('discount') === 0 });
    });
    return { lines: lines, total: Math.max(0, subtotal) };
  }

  function updateCopyrightVisibility(form) {
    var selected = form.querySelector('input[name="base_work"]:checked');
    var isOriginal = false;
    if (selected) {
      var row = state.priceRows.find(function (item) { return rowKey(item) === selected.value; });
      isOriginal = !!(row && /오리지널\s*헤드/.test(row.name || ''));
    }
    form.querySelectorAll('.conditional-copyright').forEach(function (group) {
      group.hidden = !isOriginal;
      if (!isOriginal) group.querySelectorAll('input[type="checkbox"]').forEach(function (input) { input.checked = false; });
    });
  }

  function updateQuote(form, quote) {
    updateCopyrightVisibility(form);
    var result = calculate(form);
    var lines = quote.querySelector('.quote-lines');
    var total = quote.querySelector('.quote-total strong');
    if (!result.lines.length) {
      lines.innerHTML = '<div class="quote-empty">기본 작업과 옵션을 선택하면<br>예상 견적이 여기에 표시됩니다.</div>';
    } else {
      lines.innerHTML = result.lines.map(function (line) {
        var name = line.row.name + (line.count > 1 ? ' × ' + line.count : '');
        var amountText = line.amount < 0 ? '-' + money(Math.abs(line.amount)) : money(line.amount);
        return '<div class="quote-line' + (line.discount ? ' is-discount' : '') + '"><span>' + escapeHTML(name) + '</span><span>' + escapeHTML(amountText) + '</span></div>';
      }).join('');
    }
    total.textContent = money(result.total);
    queueHeight();
    setTimeout(updateFloatingQuote, 0);
  }

  function bindFormEvents(form, quote) {
    form.addEventListener('click', function (event) {
      var minus = event.target.closest('[data-counter-minus]');
      var plus = event.target.closest('[data-counter-plus]');
      var button = minus || plus;
      if (!button) return;
      var key = button.getAttribute(minus ? 'data-counter-minus' : 'data-counter-plus');
      var input = form.querySelector('input[data-price-key="' + key + '"]');
      if (!input) return;
      var current = Math.max(0, Math.floor(numberValue(input.value)));
      input.value = minus ? Math.max(0, current - 1) : current + 1;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    form.addEventListener('input', function () { updateQuote(form, quote); });
    form.addEventListener('change', function () { updateQuote(form, quote); });
    form.addEventListener('reset', function () {
      setTimeout(function () {
        form.querySelectorAll('input[type="number"]').forEach(function (input) { input.value = '0'; });
        updateQuote(form, quote);
      }, 0);
    });
    var copyButton = quote.querySelector('#copyForm');
    copyButton.addEventListener('click', function () {
      copyApplication(form).then(function () {
        showToast('신청 양식을 복사했어요.');
      }).catch(function () {
        showToast('복사에 실패했어요. 브라우저 권한을 확인해 주세요.');
      });
    });
  }

  function fieldValue(form, name) {
    var field = form.elements[name];
    if (!field) return '';
    if (typeof RadioNodeList !== 'undefined' && field instanceof RadioNodeList) return field.value || '';
    return String(field.value || '').trim();
  }

  function selectedBaseName(form) {
    var selected = form.querySelector('input[name="base_work"]:checked');
    if (!selected) return '선택 안 함';
    var row = state.priceRows.find(function (item) { return rowKey(item) === selected.value; });
    return row ? row.name : '선택 안 함';
  }

  function applicationText(form) {
    var result = calculate(form);
    var optionLines = result.lines.length ? result.lines.map(function (line) {
      var countText = line.count > 1 ? ' × ' + line.count : '';
      var amountText = line.amount < 0 ? '-' + money(Math.abs(line.amount)) : money(line.amount);
      return '- ' + line.row.name + countText + ' (' + amountText + ')';
    }).join('\n') : '- 선택한 추가 옵션 없음';
    return [
      '[KHAKI30 커미션 신청 양식]',
      '',
      '닉네임: ' + (fieldValue(form, 'nickname') || '-'),
      '방송 플랫폼: ' + (fieldValue(form, 'platform') || '-'),
      '사용 용도: ' + (fieldValue(form, 'usage') || '-'),
      '기본 작업: ' + selectedBaseName(form),
      '',
      '[선택 옵션]',
      optionLines,
      '',
      '베이스 아바타: ' + (fieldValue(form, 'baseAvatar') || '-'),
      'BOOTH 아이템 링크:',
      fieldValue(form, 'boothItems') || '-',
      '',
      '기타 문의사항:',
      fieldValue(form, 'message') || '-',
      '',
      '예상 견적: ' + money(result.total),
      '※ 실제 견적은 작업 난이도와 자료 확인 후 달라질 수 있습니다.'
    ].join('\n');
  }

  function copyApplication(form) {
    var text = applicationText(form);
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        var ok = document.execCommand('copy');
        textarea.remove();
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (error) {
        textarea.remove();
        reject(error);
      }
    });
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('is-show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { toast.classList.remove('is-show'); }, 1800);
  }


  function elementRangeInView(top, height, viewportTop, viewportBottom, viewportHeight, currentVisible) {
    var safeHeight = Math.max(height, 1);
    var bottom = top + safeHeight;
    var enterStart = viewportTop + viewportHeight * 0.88;
    var enterEnd = viewportTop + viewportHeight * 0.08;
    var exitStart = viewportTop + viewportHeight * 0.94;
    var exitEnd = viewportTop - viewportHeight * 0.12;
    if (currentVisible) {
      return bottom >= exitEnd && top <= exitStart;
    }
    return bottom >= enterEnd && top <= enterStart;
  }

  function currentViewportRange() {
    if (state.parentViewport && state.parentViewport.height) {
      return {
        top: state.parentViewport.top,
        bottom: state.parentViewport.bottom,
        height: state.parentViewport.height
      };
    }
    var scrollTop = window.scrollY || window.pageYOffset || 0;
    var height = window.innerHeight || document.documentElement.clientHeight || 0;
    return { top: scrollTop, bottom: scrollTop + height, height: height };
  }

  function refreshRevealMetrics() {
    state.revealItems = Array.prototype.map.call(document.querySelectorAll('.will-reveal'), function (element) {
      return { element: element, top: elementDocumentTop(element), height: element.offsetHeight };
    });
  }

  function runViewportAnimations() {
    var viewport = currentViewportRange();
    if (!viewport.height) return;
    document.documentElement.style.setProperty('--float-shift', Math.max(-18, Math.min(30, viewport.top * 0.035)) + 'px');
    state.revealItems.forEach(function (item) {
      var element = item.element;
      var visible = elementRangeInView(item.top, item.height, viewport.top, viewport.bottom, viewport.height, element.classList.contains('is-inview'));
      element.classList.toggle('is-inview', visible);
    });
  }

  function refreshViewportAnimations() {
    if (state.motionTicking) return;
    state.motionTicking = true;
    window.requestAnimationFrame(function () {
      state.motionTicking = false;
      runViewportAnimations();
    });
  }

  function markRevealGroup(selector, baseDelay, step) {
    document.querySelectorAll(selector).forEach(function (element, index) {
      element.classList.add('will-reveal');
      element.style.setProperty('--reveal-delay', (baseDelay + (step || 0) * index) + 'ms');
    });
  }

  function setupDecorMotion() {
    markRevealGroup('#intro .eyebrow, #intro h1, #intro .hero-lead, #intro .hero-profile, #intro .hero-signature', 0, 85);
    markRevealGroup('#intro .hero-visual', 180, 0);
    markRevealGroup('#calendar .status-card', 30, 70);
    markRevealGroup('#calendar .calendar-shell', 180, 0);
    markRevealGroup('#process .process-step', 30, 55);
    markRevealGroup('#notice .notice-card', 30, 75);
    markRevealGroup('#price .price-group-block', 30, 80);
    markRevealGroup('#price .price-row', 40, 18);
    markRevealGroup('#portfolio .portfolio-card', 40, 70);
    markRevealGroup('#form .form-group', 30, 70);

    document.querySelectorAll('.hero-visual, .status-card, .notice-card, .price-group-block, .price-row, .portfolio-card, .choice-card label, .item-block, .calendar-shell').forEach(function (element) {
      element.classList.add('interactive-card');
    });

    refreshRevealMetrics();
    refreshViewportAnimations();
    queueHeight();
  }

  function bindMotionHandlers() {
    if (state.motionBound) return;
    state.motionBound = true;
    window.addEventListener('scroll', refreshViewportAnimations, { passive: true });
    window.addEventListener('resize', function () {
      refreshRevealMetrics();
      refreshViewportAnimations();
      updateFloatingQuote();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshViewportAnimations();
    });
  }

  function openLightbox(src, alt) {
    var lightbox = document.getElementById('lightbox');
    var image = lightbox.querySelector('img');
    image.src = src;
    image.alt = alt || '포트폴리오 크게 보기';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    if (window.parent === window) document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    var lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    if (window.parent === window) document.body.style.overflow = '';
  }

  function bindLightbox() {
    var lightbox = document.getElementById('lightbox');
    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (event) { if (event.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox(); });
  }

  function postToParent(payload) {
    if (window.parent === window) return;
    window.parent.postMessage(payload, '*');
  }

  function measureHeight() {
    var body = document.body;
    var html = document.documentElement;
    return Math.ceil(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));
  }

  function sendHeight() {
    postToParent({ source: 'syura-css', type: 'SYURA_IFRAME_HEIGHT', height: measureHeight() });
  }

  function queueHeight() {
    clearTimeout(state.heightTimer);
    state.heightTimer = setTimeout(function () {
      refreshRevealMetrics();
      sendHeight();
    }, 80);
  }

  function updateParentViewport(data) {
    var iframeTop = numberValue(data.iframeTop);
    var iframeHeight = Math.max(0, numberValue(data.iframeHeight) || measureHeight());
    var viewportHeight = Math.max(0, numberValue(data.viewportHeight));
    var visibleTop = Math.max(0, -iframeTop);
    var visibleBottom = Math.min(iframeHeight, viewportHeight - iframeTop);
    var visibleHeight = Math.max(0, visibleBottom - visibleTop);
    if (state.parentViewport && Math.abs(state.parentViewport.top - visibleTop) < 0.5 && Math.abs(state.parentViewport.height - visibleHeight) < 0.5) {
      return;
    }
    state.parentViewport = {
      top: visibleTop,
      bottom: visibleBottom,
      height: visibleHeight
    };
    document.documentElement.classList.add('is-parent-embedded');
    document.documentElement.style.setProperty('--parent-viewport-top', visibleTop + 'px');
    document.documentElement.style.setProperty('--parent-viewport-height', visibleHeight + 'px');
    updateFloatingQuote();
    refreshViewportAnimations();
  }

  function elementDocumentTop(element) {
    if (!element) return 0;
    return element.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
  }

  function updateFloatingQuote() {
    var viewport = state.parentViewport;
    var section = document.getElementById('form');
    if (!section) return;
    var layout = section.querySelector('.form-layout');
    var form = section.querySelector('.commission-form');
    var quote = section.querySelector('.quote-panel');
    if (!layout || !quote || quote.classList.contains('skeleton-block')) return;
    quote.classList.remove('will-reveal');
    quote.classList.add('is-inview');

    var quoteHeight = Math.max(1, quote.offsetHeight || 0);
    var margin = 18;
    var reserve = Math.ceil(quoteHeight + margin + 22);
    document.documentElement.style.setProperty('--quote-height', quoteHeight + 'px');
    layout.style.setProperty('--quote-reserve', reserve + 'px');

    if (!document.documentElement.classList.contains('is-parent-embedded') || !viewport) {
      quote.classList.remove('is-floating-visible');
      quote.style.top = '';
      return;
    }

    var layoutTop = elementDocumentTop(layout);
    var formHeight = form ? form.offsetHeight : 0;
    var layoutHeight = Math.max(layout.offsetHeight, formHeight + reserve);
    var layoutBottom = layoutTop + layoutHeight;
    var visible = viewport.bottom > layoutTop + 24 && viewport.top < layoutBottom - 24;

    if (!visible) {
      quote.classList.remove('is-floating-visible');
      quote.style.top = '';
      return;
    }

    var desiredTop = viewport.bottom - layoutTop - quoteHeight - margin;
    var minTop = Math.max(0, viewport.top - layoutTop + 12);
    var maxTop = Math.max(0, layoutHeight - quoteHeight - margin);
    var nextTop = Math.max(minTop, Math.min(desiredTop, maxTop));

    quote.style.top = nextTop + 'px';
    quote.classList.add('is-floating-visible');
  }

  function bindParentBridge() {
    window.addEventListener('message', function (event) {
      var data = event.data || {};
      if (data.source !== 'syura-artmug-parent') return;
      if (data.type === 'SYURA_PARENT_VIEWPORT') {
        updateParentViewport(data);
        return;
      }
      if (data.type === 'SYURA_PARENT_NAV_TO') {
        var target = document.getElementById(data.sectionId);
        if (!target) return;
        postToParent({ source: 'syura-css', type: 'SYURA_PARENT_SCROLL_TO', targetY: target.offsetTop });
      }
    });
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(queueHeight);
      observer.observe(document.documentElement);
      observer.observe(document.body);
    } else {
      window.addEventListener('resize', queueHeight);
      setInterval(sendHeight, 1000);
    }
    window.addEventListener('load', function () { setTimeout(sendHeight, 60); setTimeout(sendHeight, 600); });
    postToParent({ source: 'syura-css', type: 'SYURA_IFRAME_READY' });
  }

  function preparePriceRows(rows) {
    return rows.filter(function (row) { return row.name && row.type; }).map(function (row, index) {
      var copy = Object.assign({}, row);
      copy._key = String(index);
      copy.price = numberValue(copy.price);
      copy.calc_type = String(copy.calc_type || 'add').trim().toLowerCase();
      return copy;
    });
  }

  function loadMeta() {
    return fetchCSV(META_GID).catch(function () { return FALLBACK_META; }).then(function (rows) {
      state.meta = (rows.length ? rows : FALLBACK_META).filter(function (row) { return row.id; }).sort(function (a, b) { return numberValue(a.order) - numberValue(b.order); });
      setSectionMeta();
      return state.meta;
    });
  }

  function loadPriceMeta() {
    return fetchCSV(PRICE_META_GID).catch(function () { return FALLBACK_PRICE_META; }).then(function (rows) {
      state.priceMeta = (rows.length ? rows : FALLBACK_PRICE_META).sort(function (a, b) { return numberValue(a.t_order) - numberValue(b.t_order); });
      return state.priceMeta;
    });
  }

  function loadSections() {
    var visible = state.meta.filter(function (meta) { return isTrue(meta.visible) && meta.gid; });
    return Promise.all(visible.map(function (meta) {
      return fetchCSV(meta.gid).then(function (rows) {
        state.sheets[meta.id] = rows;
        return { id: meta.id, rows: rows };
      }).catch(function (error) {
        state.sheets[meta.id] = null;
        return { id: meta.id, rows: null, error: error };
      });
    }));
  }

  function renderLoadedSections(results) {
    results.forEach(function (result) {
      if (!result.rows) {
        if (result.id === 'intro') sectionError('intro', '.hero-profile', '작가 소개를 불러오지 못했습니다.');
        if (result.id === 'calendar') sectionError('calendar', '.calendar-board', '예약 현황을 불러오지 못했습니다.');
        if (result.id === 'process') sectionError('process', '.process-list', '작업 순서를 불러오지 못했습니다.');
        if (result.id === 'notice') sectionError('notice', '.notice-grid', '안내사항을 불러오지 못했습니다.');
        if (result.id === 'price') sectionError('price', '.price-groups', '가격표를 불러오지 못했습니다.');
        if (result.id === 'portfolio') sectionError('portfolio', '.portfolio-grid', '포트폴리오를 불러오지 못했습니다.');
        return;
      }
      if (result.id === 'intro') renderIntro(result.rows);
      if (result.id === 'calendar') renderCalendar(result.rows);
      if (result.id === 'process') renderProcess(result.rows);
      if (result.id === 'notice') renderNotice(result.rows);
      if (result.id === 'portfolio') renderPortfolio(result.rows);
      if (result.id === 'price') {
        state.priceRows = preparePriceRows(result.rows);
        renderPrice(state.priceRows, state.priceMeta);
      }
    });
    if (state.priceRows.length) renderForm(state.priceRows);
    else renderForm([]);
    setupDecorMotion();
  }

  function boot() {
    bindLightbox();
    bindParentBridge();
    bindMotionHandlers();
    Promise.all([loadMeta(), loadPriceMeta()]).then(function () {
      return loadSections();
    }).then(renderLoadedSections).catch(function () {
      ['intro', 'calendar', 'process', 'notice', 'price', 'portfolio'].forEach(function (id) {
        var section = document.getElementById(id);
        if (section) section.classList.remove('section-loading');
      });
      renderForm([]);
    }).finally(function () {
      setTimeout(sendHeight, 100);
      setTimeout(sendHeight, 700);
      setTimeout(sendHeight, 1600);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
