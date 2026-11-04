import { describe, expect, it } from 'vitest';
import {
  ReminderItem,
  ReminderState,
  QuestRecurrence,
  createInitialReminderState,
  addReminderItem,
  toggleReminderItem,
  deleteReminderItem,
  clearCompletedReminders,
  parseRemindersJson,
  serializeRemindersJson,
  extractDueDateToken,
  formatReminderDueBadge,
  formatDisplayDate,
  cycleReminderFontScale,
  updateReminderPreferences,
  DateFormatPreference,
  WeekStartDay,
  clampStickyDimensions,
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  MIN_STICKY_WIDTH,
  MAX_STICKY_WIDTH,
  MIN_STICKY_HEIGHT,
  MAX_STICKY_HEIGHT,
  StickyTabId,
  computeNextRecurringDueDate,
  updateReminderDueDate,
} from '../src/core/reminderStore';

describe('reminderStore', () => {
  it('creates initial reminder state with 3 default Usagi starter tasks and custard theme', () => {
    const state = createInitialReminderState();
    expect(state.stickyVisible).toBe(true);
    expect(state.theme).toBe('custard');
    expect(state.fontScale).toBe('md');
    expect(state.stickyWidth).toBe(350);
    expect(state.stickyHeight).toBe(480);
    expect(state.stickyX).toBeNull();
    expect(state.stickyY).toBeNull();
    expect(state.activeStickyTab).toBe('quests');
    expect(state.items.length).toBe(3);
    expect(state.items[0].text).toContain('Drink a glass of water');
    expect(state.items[1].text).toContain('25m Focus Session');
    expect(state.items[2].text).toContain('Stretch shoulders');
    expect(state.items.every((it) => it.completed === false)).toBe(true);
  });

  it('cycles fontScale sm -> md -> lg -> sm', () => {
    let state = createInitialReminderState();
    expect(state.fontScale).toBe('md');
    state = cycleReminderFontScale(state);
    expect(state.fontScale).toBe('lg');
    state = cycleReminderFontScale(state);
    expect(state.fontScale).toBe('sm');
    state = cycleReminderFontScale(state);
    expect(state.fontScale).toBe('md');
  });

  it('preserves valid fontScale and defaults invalid or missing fontScale to md in JSON', () => {
    const sLg = JSON.stringify({ ...createInitialReminderState(), fontScale: 'lg' });
    expect(parseRemindersJson(sLg).fontScale).toBe('lg');

    const sSm = JSON.stringify({ ...createInitialReminderState(), fontScale: 'sm' });
    expect(parseRemindersJson(sSm).fontScale).toBe('sm');

    const sInvalid = JSON.stringify({ ...createInitialReminderState(), fontScale: 'huge' });
    expect(parseRemindersJson(sInvalid).fontScale).toBe('md');

    const sMissing = JSON.stringify({ items: [] });
    expect(parseRemindersJson(sMissing).fontScale).toBe('md');
  });

  it('adds valid task and trims whitespace, ignoring empty or whitespace-only inputs', () => {
    const initial = createInitialReminderState();
    const countBefore = initial.items.length;

    // Whitespace / empty inputs should not mutate items
    const s1 = addReminderItem(initial, '   ');
    expect(s1.items.length).toBe(countBefore);

    const s2 = addReminderItem(initial, '');
    expect(s2.items.length).toBe(countBefore);

    // Valid item
    const s3 = addReminderItem(initial, '  Review PR diff with Usagi  ', 1000);
    expect(s3.items.length).toBe(countBefore + 1);
    const added = s3.items[s3.items.length - 1];
    expect(added.text).toBe('Review PR diff with Usagi');
    expect(added.completed).toBe(false);
    expect(added.createdAtMs).toBe(1000);
    expect(added.id).toBeTruthy();
  });

  it('truncates tasks longer than 120 characters and enforces maximum 30 items limit', () => {
    let state = createInitialReminderState();
    const longText = 'A'.repeat(150);
    state = addReminderItem(state, longText);
    const lastItem = state.items[state.items.length - 1];
    expect(lastItem.text.length).toBe(120);

    // Fill up to 30 items
    while (state.items.length < 30) {
      state = addReminderItem(state, `Task ${state.items.length}`);
    }
    expect(state.items.length).toBe(30);

    // Adding beyond 30 should be ignored
    const sOver = addReminderItem(state, 'Task 31');
    expect(sOver.items.length).toBe(30);
  });

  it('toggles reminder item completion and reports newlyCompleted only on false -> true', () => {
    const state = createInitialReminderState();
    const firstId = state.items[0].id;

    // Toggle false -> true
    const { state: s1, newlyCompleted: c1 } = toggleReminderItem(state, firstId);
    expect(s1.items[0].completed).toBe(true);
    expect(c1).not.toBeNull();
    expect(c1?.id).toBe(firstId);
    expect(c1?.completed).toBe(true);

    // Toggle true -> false (unchecking should NOT trigger task celebration)
    const { state: s2, newlyCompleted: c2 } = toggleReminderItem(s1, firstId);
    expect(s2.items[0].completed).toBe(false);
    expect(c2).toBeNull();

    // Toggling non-existent ID
    const { state: s3, newlyCompleted: c3 } = toggleReminderItem(s2, 'non-existent-id');
    expect(s3).toEqual(s2);
    expect(c3).toBeNull();
  });

  it('deletes reminder item by id', () => {
    const state = createInitialReminderState();
    const targetId = state.items[1].id;
    const next = deleteReminderItem(state, targetId);
    expect(next.items.length).toBe(state.items.length - 1);
    expect(next.items.some((it) => it.id === targetId)).toBe(false);
  });

  it('clears all completed reminders', () => {
    let state = createInitialReminderState();
    state = toggleReminderItem(state, state.items[0].id).state;
    state = toggleReminderItem(state, state.items[2].id).state;
    expect(state.items.filter((it) => it.completed).length).toBe(2);

    const cleared = clearCompletedReminders(state);
    expect(cleared.items.length).toBe(1);
    expect(cleared.items.every((it) => !it.completed)).toBe(true);
  });

  it('serializes and deserializes reminders JSON safely and normalizes legacy night theme to custard', () => {
    let state = createInitialReminderState();
    state.stickyVisible = false;
    state = addReminderItem(state, 'Bedtime chamomile tea');

    const json = serializeRemindersJson(state);
    const parsed = parseRemindersJson(json);

    expect(parsed.theme).toBe('custard');
    expect(parsed.stickyVisible).toBe(false);
    expect(parsed.items.length).toBe(4);
    expect(parsed.items[3].text).toBe('Bedtime chamomile tea');

    // Legacy night theme migration check
    const legacyNightJson = JSON.stringify({
      theme: 'night',
      stickyVisible: true,
      items: [{ id: 'leg-1', text: 'Legacy night task', completed: false, createdAtMs: 100 }],
    });
    const migrated = parseRemindersJson(legacyNightJson);
    expect(migrated.theme).toBe('custard');
  });

  it('gracefully recovers from null, empty, malformed or invalid JSON', () => {
    // Null / undefined / empty
    expect(parseRemindersJson(null).items.length).toBe(3);
    expect(parseRemindersJson(undefined).items.length).toBe(3);
    expect(parseRemindersJson('').items.length).toBe(3);
    expect(parseRemindersJson('   ').items.length).toBe(3);

    // Malformed JSON syntax
    expect(parseRemindersJson('{ corrupt json:').items.length).toBe(3);

    // Valid JSON but non-object or missing items
    expect(parseRemindersJson('[]').items.length).toBe(3);
    expect(parseRemindersJson('{"random": 123}').items.length).toBe(3);
    expect(parseRemindersJson('{"items": "not-an-array"}').items.length).toBe(3);

    // Corrupted items in array are filtered out
    const partialValid = JSON.stringify({
      theme: 'night',
      stickyVisible: true,
      items: [
        { id: '1', text: 'Valid task', completed: true, createdAtMs: 123 },
        { id: 2, text: null }, // corrupted
        'string instead of item',
      ],
    });
    const parsedPartial = parseRemindersJson(partialValid);
    expect(parsedPartial.theme).toBe('custard');
    expect(parsedPartial.items.length).toBe(1);
    expect(parsedPartial.items[0].text).toBe('Valid task');
  });

  it('drops impossible persisted due dates while keeping the quest', () => {
    const json = JSON.stringify({
      items: [
        {
          id: 'impossible-day',
          text: 'Broken ISO date',
          completed: false,
          createdAtMs: 1,
          dueDate: '2026-99-99',
        },
        {
          id: 'rolled-over-day',
          text: 'Rolled over date',
          completed: false,
          createdAtMs: 2,
          dueDate: '2026-02-30',
        },
        {
          id: 'valid-date',
          text: 'Valid date',
          completed: false,
          createdAtMs: 3,
          dueDate: '2024-02-29',
        },
      ],
    });

    const parsed = parseRemindersJson(json);
    expect(parsed.items).toHaveLength(3);
    expect(parsed.items[0].dueDate).toBeUndefined();
    expect(parsed.items[1].dueDate).toBeUndefined();
    expect(parsed.items[2].dueDate).toBe('2024-02-29');
  });

  describe('extractDueDateToken', () => {
    const fixedNow = new Date(2026, 10, 2); // 2026-11-02 (month index 10 is November)

    it('parses @today token and cleans text', () => {
      const res = extractDueDateToken('Submit report @today', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Submit report',
        dueDate: '2026-11-02',
      });
    });

    it('parses @tomorrow and @tmrw tokens and cleans text', () => {
      const res = extractDueDateToken('Buy cake @tomorrow', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Buy cake',
        dueDate: '2026-11-03',
      });
      const resTmrw = extractDueDateToken('Buy coffee @tmrw', undefined, fixedNow);
      expect(resTmrw).toEqual({
        cleanText: 'Buy coffee',
        dueDate: '2026-11-03',
      });
    });

    it('parses @+Nd token and cleans text', () => {
      const res = extractDueDateToken('Trip @+5d', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Trip',
        dueDate: '2026-11-07',
      });
    });

    it('parses explicit @YYYY-MM-DD token and cleans text', () => {
      const res = extractDueDateToken('Exam @2026-12-15', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Exam',
        dueDate: '2026-12-15',
      });
    });

    it('ignores impossible explicit dates instead of storing them', () => {
      const iso = extractDueDateToken('Exam @2026-99-99', undefined, fixedNow);
      expect(iso.dueDate).toBeUndefined();
      expect(iso.cleanText).toContain('2026-99-99');

      const rolledOver = extractDueDateToken('Exam 2026-04-31', undefined, fixedNow);
      expect(rolledOver.dueDate).toBeUndefined();
      expect(rolledOver.cleanText).toContain('2026-04-31');
    });

    it('rejects impossible slash dates while accepting real leap days', () => {
      const invalid = extractDueDateToken('Dentist 31/02/2026', undefined, fixedNow);
      expect(invalid.dueDate).toBeUndefined();
      expect(invalid.cleanText).toContain('31/02/2026');

      expect(extractDueDateToken('Leap day 29/02/2024', undefined, fixedNow).dueDate).toBe(
        '2024-02-29'
      );
    });

    it('falls back to defaultDateStr when no inline token is provided', () => {
      const res = extractDueDateToken('Read chapter 4', '2026-11-20', fixedNow);
      expect(res).toEqual({
        cleanText: 'Read chapter 4',
        dueDate: '2026-11-20',
      });
    });

    it('leaves dueDate undefined when no token or default is provided', () => {
      const res = extractDueDateToken('Simple reminder', undefined, fixedNow);
      expect(res).toEqual({
        cleanText: 'Simple reminder',
        dueDate: undefined,
      });
    });

    it('extracts natural language deadlines with conversational prefixes and capitalizes clean text', () => {
      expect(extractDueDateToken('I have to do chores tomorrow', undefined, fixedNow)).toEqual({
        cleanText: 'Do chores',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('i need to submit the report today', undefined, fixedNow)).toEqual(
        {
          cleanText: 'Submit the report',
          dueDate: '2026-11-02',
        }
      );
      expect(extractDueDateToken('Remind me to call mom tonight', undefined, fixedNow)).toEqual({
        cleanText: 'Call mom',
        dueDate: '2026-11-02',
      });
      expect(
        extractDueDateToken("Don't forget to pay rent in 5 days", undefined, fixedNow)
      ).toEqual({
        cleanText: 'Pay rent',
        dueDate: '2026-11-07',
      });
      expect(extractDueDateToken('Remember to clean desk next week', undefined, fixedNow)).toEqual({
        cleanText: 'Clean desk',
        dueDate: '2026-11-09',
      });
    });

    it('extracts trailing or inline natural date tokens without conversational prefix', () => {
      expect(extractDueDateToken('Buy groceries tmrw', undefined, fixedNow)).toEqual({
        cleanText: 'Buy groceries',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Finish homework by tomorrow', undefined, fixedNow)).toEqual({
        cleanText: 'Finish homework',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Dentist appointment on 2026-11-15', undefined, fixedNow)).toEqual(
        {
          cleanText: 'Dentist appointment',
          dueDate: '2026-11-15',
        }
      );
    });

    it('cleans conversational prefix without a date token and capitalizes action', () => {
      expect(extractDueDateToken('I have to water the plants', undefined, fixedNow)).toEqual({
        cleanText: 'Water the plants',
        dueDate: undefined,
      });
    });

    it('extracts multilingual deadlines and conversational prefixes (VI, DE, FR, ES, JA, KO, ZH, and DD/MM)', () => {
      // Vietnamese (🇻🇳)
      expect(extractDueDateToken('Tôi phải dọn nhà ngày mai', undefined, fixedNow)).toEqual({
        cleanText: 'Dọn nhà',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Mai đi chợ', undefined, fixedNow)).toEqual({
        cleanText: 'Đi chợ',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Nhớ nộp bài hôm nay', undefined, fixedNow)).toEqual({
        cleanText: 'Nộp bài',
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Đi khám răng ngày mốt', undefined, fixedNow)).toEqual({
        cleanText: 'Đi khám răng',
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('Nộp báo cáo 3 ngày nữa', undefined, fixedNow)).toEqual({
        cleanText: 'Nộp báo cáo',
        dueDate: '2026-11-05',
      });
      expect(extractDueDateToken('Họp nhóm tuần sau', undefined, fixedNow)).toEqual({
        cleanText: 'Họp nhóm',
        dueDate: '2026-11-09',
      });

      // German (🇩🇪)
      expect(extractDueDateToken('Ich muss morgen einkaufen', undefined, fixedNow)).toEqual({
        cleanText: 'Einkaufen',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Bericht abgeben heute', undefined, fixedNow)).toEqual({
        cleanText: 'Bericht abgeben',
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Zahnarzt übermorgen', undefined, fixedNow)).toEqual({
        cleanText: 'Zahnarzt',
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('Miete zahlen in 5 Tagen', undefined, fixedNow)).toEqual({
        cleanText: 'Miete zahlen',
        dueDate: '2026-11-07',
      });
      expect(extractDueDateToken('Projekt starten nächste Woche', undefined, fixedNow)).toEqual({
        cleanText: 'Projekt starten',
        dueDate: '2026-11-09',
      });

      // French (🇫🇷)
      expect(extractDueDateToken('Je dois faire les courses demain', undefined, fixedNow)).toEqual({
        cleanText: 'Faire les courses',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken("Appeler maman aujourd'hui", undefined, fixedNow)).toEqual({
        cleanText: 'Appeler maman',
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Rendez-vous après-demain', undefined, fixedNow)).toEqual({
        cleanText: 'Rendez-vous',
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('Payer le loyer dans 4 jours', undefined, fixedNow)).toEqual({
        cleanText: 'Payer le loyer',
        dueDate: '2026-11-06',
      });
      expect(extractDueDateToken('Réunion la semaine prochaine', undefined, fixedNow)).toEqual({
        cleanText: 'Réunion',
        dueDate: '2026-11-09',
      });

      // Spanish (🇪🇸)
      expect(extractDueDateToken('Tengo que limpiar la casa mañana', undefined, fixedNow)).toEqual({
        cleanText: 'Limpiar la casa',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('Enviar correo hoy', undefined, fixedNow)).toEqual({
        cleanText: 'Enviar correo',
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Examen pasado mañana', undefined, fixedNow)).toEqual({
        cleanText: 'Examen',
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('Pagar factura en 3 días', undefined, fixedNow)).toEqual({
        cleanText: 'Pagar factura',
        dueDate: '2026-11-05',
      });
      expect(extractDueDateToken('Viaje la próxima semana', undefined, fixedNow)).toEqual({
        cleanText: 'Viaje',
        dueDate: '2026-11-09',
      });

      // Japanese (🇯🇵)
      expect(extractDueDateToken('明日掃除する', undefined, fixedNow)).toEqual({
        cleanText: '掃除する',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('今日レポート提出', undefined, fixedNow)).toEqual({
        cleanText: 'レポート提出',
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('明後日歯医者に行く', undefined, fixedNow)).toEqual({
        cleanText: '歯医者に行く',
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('3日後に家賃を払う', undefined, fixedNow)).toEqual({
        cleanText: '家賃を払う',
        dueDate: '2026-11-05',
      });
      expect(extractDueDateToken('来週ミーティング', undefined, fixedNow)).toEqual({
        cleanText: 'ミーティング',
        dueDate: '2026-11-09',
      });

      // Korean (🇰🇷)
      expect(extractDueDateToken('내일 청소하기', undefined, fixedNow)).toEqual({
        cleanText: '청소하기',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('오늘 숙제 해야 해', undefined, fixedNow)).toEqual({
        cleanText: '숙제',
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('모레 병원 가기', undefined, fixedNow)).toEqual({
        cleanText: '병원 가기',
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('3일 후 발표 준비', undefined, fixedNow)).toEqual({
        cleanText: '발표 준비',
        dueDate: '2026-11-05',
      });
      expect(extractDueDateToken('다음 주 회의', undefined, fixedNow)).toEqual({
        cleanText: '회의',
        dueDate: '2026-11-09',
      });

      // Chinese (🇨🇳)
      expect(extractDueDateToken('明天要打扫房间', undefined, fixedNow)).toEqual({
        cleanText: '打扫房间',
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('今天交作业', undefined, fixedNow)).toEqual({
        cleanText: '交作业',
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('后天看牙医', undefined, fixedNow)).toEqual({
        cleanText: '看牙医',
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('3天后交房租', undefined, fixedNow)).toEqual({
        cleanText: '交房租',
        dueDate: '2026-11-05',
      });
      expect(extractDueDateToken('下周开会', undefined, fixedNow)).toEqual({
        cleanText: '开会',
        dueDate: '2026-11-09',
      });

      // Universal DD/MM and DD/MM/YYYY
      expect(extractDueDateToken('Khám răng ngày 15/11', undefined, fixedNow)).toEqual({
        cleanText: 'Khám răng',
        dueDate: '2026-11-15',
      });
      expect(extractDueDateToken('Submit thesis on 20/12/2026', undefined, fixedNow)).toEqual({
        cleanText: 'Submit thesis',
        dueDate: '2026-12-20',
      });

      // Format-aware slash dates: DD/MM (default) vs MM/DD
      expect(extractDueDateToken('Project due 05/11', undefined, fixedNow, 'DD/MM')).toEqual({
        cleanText: 'Project',
        dueDate: '2026-11-05',
      });
      expect(extractDueDateToken('Project due 11/05', undefined, fixedNow, 'MM/DD')).toEqual({
        cleanText: 'Project',
        dueDate: '2026-11-05',
      });
    });
  });

  describe('formatReminderDueBadge and formatDisplayDate', () => {
    it('formats display dates in DD/MM by default and MM/DD when configured', () => {
      expect(formatDisplayDate('2026-11-05', 'DD/MM', false)).toBe('05/11');
      expect(formatDisplayDate('2026-11-05', 'DD/MM', true)).toBe('05/11/2026');
      expect(formatDisplayDate('2026-11-05', 'MM/DD', false)).toBe('11/05');
      expect(formatDisplayDate('2026-11-05', 'MM/DD', true)).toBe('11/05/2026');
      expect(formatDisplayDate('invalid-date')).toBe('invalid-date');
    });

    it('formats badge with relative label and actual resolved date in DD/MM by default', () => {
      expect(formatReminderDueBadge('2026-11-02', '2026-11-02')).toBe('Today (02/11)');
      expect(formatReminderDueBadge('2026-11-03', '2026-11-02')).toBe('Tmrw (03/11)');
      expect(formatReminderDueBadge('2026-11-01', '2026-11-02')).toBe('Yesterday (01/11)');
      expect(formatReminderDueBadge('2026-10-28', '2026-11-02')).toBe('Overdue (28/10)');
      expect(formatReminderDueBadge('2026-11-10', '2026-11-02')).toBe('Due 10/11');
    });

    it('formats badge in localized language when locale is provided', () => {
      expect(formatReminderDueBadge('2026-11-02', '2026-11-02', 'DD/MM', 'vi')).toBe(
        'Hôm nay (02/11)'
      );
      expect(formatReminderDueBadge('2026-11-03', '2026-11-02', 'DD/MM', 'vi')).toBe(
        'Ngày mai (03/11)'
      );
      expect(formatReminderDueBadge('2026-10-28', '2026-11-02', 'DD/MM', 'vi')).toBe(
        'Quá hạn (28/10)'
      );
      expect(formatReminderDueBadge('2026-11-10', '2026-11-02', 'DD/MM', 'vi')).toBe('Hạn 10/11');
      expect(formatReminderDueBadge('2026-11-02', '2026-11-02', 'DD/MM', 'ja')).toBe(
        '今日 (02/11)'
      );
    });

    it('supports MM/DD format in formatReminderDueBadge', () => {
      expect(formatReminderDueBadge('2026-11-10', '2026-11-02', 'MM/DD')).toBe('Due 11/10');
      expect(formatReminderDueBadge('2026-11-02', '2026-11-02', 'MM/DD')).toBe('Today (11/02)');
    });
  });

  describe('updateReminderPreferences', () => {
    it('updates dateFormat, weekStartsOn, stickyAlwaysOnTop and fontScale', () => {
      let state = createInitialReminderState();
      expect(state.dateFormat).toBe('DD/MM');
      expect(state.weekStartsOn).toBe(1);
      expect(state.stickyAlwaysOnTop).toBe(false);

      state = updateReminderPreferences(state, {
        dateFormat: 'MM/DD',
        weekStartsOn: 0,
        stickyAlwaysOnTop: true,
        fontScale: 'lg',
      });
      expect(state.dateFormat).toBe('MM/DD');
      expect(state.weekStartsOn).toBe(0);
      expect(state.stickyAlwaysOnTop).toBe(true);
      expect(state.fontScale).toBe('lg');

      const json = serializeRemindersJson(state);
      const restored = parseRemindersJson(json);
      expect(restored.dateFormat).toBe('MM/DD');
      expect(restored.weekStartsOn).toBe(0);
      expect(restored.stickyAlwaysOnTop).toBe(true);
      expect(restored.fontScale).toBe('lg');
    });

    it('updates and clamps sticky dimensions, coordinates and activeStickyTab', () => {
      let state = createInitialReminderState();
      state = updateReminderPreferences(state, {
        stickyWidth: 200, // below MIN 290
        stickyHeight: 1200, // above MAX 880
        stickyX: 140.4,
        stickyY: 280.9,
        activeStickyTab: 'schedule',
      });
      expect(state.stickyWidth).toBe(290);
      expect(state.stickyHeight).toBe(880);
      expect(state.stickyX).toBe(140);
      expect(state.stickyY).toBe(281);
      expect(state.activeStickyTab).toBe('schedule');

      state = updateReminderPreferences(state, {
        stickyWidth: 999, // above MAX 640
        stickyHeight: 100, // below MIN 380
        stickyX: null,
        stickyY: null,
        activeStickyTab: 'calendar',
      });
      expect(state.stickyWidth).toBe(640);
      expect(state.stickyHeight).toBe(380);
      expect(state.stickyX).toBeNull();
      expect(state.stickyY).toBeNull();
      expect(state.activeStickyTab).toBe('calendar');
    });

    it('defaults missing or corrupted preferences to safe defaults in parseRemindersJson', () => {
      const parsed = parseRemindersJson('{"items": []}');
      expect(parsed.dateFormat).toBe('DD/MM');
      expect(parsed.weekStartsOn).toBe(1);
      expect(parsed.stickyAlwaysOnTop).toBe(false);
      expect(parsed.stickyWidth).toBe(350);
      expect(parsed.stickyHeight).toBe(480);
      expect(parsed.stickyX).toBeNull();
      expect(parsed.stickyY).toBeNull();
      expect(parsed.activeStickyTab).toBe('quests');
    });

    it('round-trips sticky geometry and active tab through JSON', () => {
      let state = createInitialReminderState();
      state = updateReminderPreferences(state, {
        stickyWidth: 420,
        stickyHeight: 600,
        stickyX: 300,
        stickyY: 150,
        activeStickyTab: 'calendar',
      });
      const json = serializeRemindersJson(state);
      const restored = parseRemindersJson(json);
      expect(restored.stickyWidth).toBe(420);
      expect(restored.stickyHeight).toBe(600);
      expect(restored.stickyX).toBe(300);
      expect(restored.stickyY).toBe(150);
      expect(restored.activeStickyTab).toBe('calendar');
    });

    it('clampStickyDimensions enforces min/max bounds and handles invalid inputs', () => {
      expect(clampStickyDimensions(undefined, undefined)).toEqual({ width: 350, height: 480 });
      expect(clampStickyDimensions(100, 1000)).toEqual({ width: 290, height: 880 });
      expect(clampStickyDimensions(800, 200)).toEqual({ width: 640, height: 380 });
      expect(clampStickyDimensions(400.6, 500.4)).toEqual({ width: 401, height: 500 });
      expect(clampStickyDimensions('abc', NaN)).toEqual({ width: 350, height: 480 });
    });
  });

  describe('Date-linked reminder items', () => {
    it('stores explicit dueDate or parses inline @tomorrow token in addReminderItem', () => {
      let state = createInitialReminderState();
      state = addReminderItem(state, 'Study math', 1000, 'item-1', '2026-11-05');
      const added = state.items[state.items.length - 1];
      expect(added.id).toBe('item-1');
      expect(added.text).toBe('Study math');
      expect(added.dueDate).toBe('2026-11-05');

      // Test inline parsing within addReminderItem
      const fixedNowMs = new Date(2026, 10, 2).getTime();
      state = addReminderItem(state, 'Buy flowers @tomorrow', fixedNowMs);
      const addedInline = state.items[state.items.length - 1];
      expect(addedInline.text).toBe('Buy flowers');
      expect(addedInline.dueDate).toBe('2026-11-03');
    });

    it('preserves dueDate through JSON serialization and deserialization', () => {
      let state = createInitialReminderState();
      state = addReminderItem(state, 'Doctor appointment', 1000, 'item-doc', '2026-11-12');
      const json = serializeRemindersJson(state);
      const restored = parseRemindersJson(json);
      const restoredItem = restored.items.find((i) => i.id === 'item-doc');
      expect(restoredItem?.dueDate).toBe('2026-11-12');
    });
  });

  describe('Natural Language Recurring Quests (#11, #13 distilled)', () => {
    // Fixed now: Monday 2026-11-02
    const fixedNow = new Date(2026, 10, 2);
    const fixedNowMs = fixedNow.getTime();

    it('extracts "every day", "daily", "@daily" recurrence and sets initial dueDate to today', () => {
      const res1 = extractDueDateToken('Drink 2L water every day', undefined, fixedNow);
      expect(res1.cleanText).toBe('Drink 2L water');
      expect(res1.repeat).toEqual({ type: 'daily' });
      expect(res1.dueDate).toBe('2026-11-02');

      const res2 = extractDueDateToken('Team sync @daily', undefined, fixedNow);
      expect(res2.cleanText).toBe('Team sync');
      expect(res2.repeat).toEqual({ type: 'daily' });
      expect(res2.dueDate).toBe('2026-11-02');

      const res3 = extractDueDateToken('Đi chợ mỗi ngày', undefined, fixedNow);
      expect(res3.cleanText).toBe('Đi chợ');
      expect(res3.repeat).toEqual({ type: 'daily' });

      // Multilingual daily
      expect(extractDueDateToken('Pflanzen gießen jeden Tag', undefined, fixedNow)).toEqual({
        cleanText: 'Pflanzen gießen',
        repeat: { type: 'daily' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken("Boire de l'eau tous les jours", undefined, fixedNow)).toEqual({
        cleanText: "Boire de l'eau",
        repeat: { type: 'daily' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Tomar agua todos los días', undefined, fixedNow)).toEqual({
        cleanText: 'Tomar agua',
        repeat: { type: 'daily' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('毎日ストレッチする', undefined, fixedNow)).toEqual({
        cleanText: 'ストレッチする',
        repeat: { type: 'daily' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('매일 물 마시기', undefined, fixedNow)).toEqual({
        cleanText: '물 마시기',
        repeat: { type: 'daily' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('每天背单词', undefined, fixedNow)).toEqual({
        cleanText: '背单词',
        repeat: { type: 'daily' },
        dueDate: '2026-11-02',
      });
    });

    it('extracts "every weekday", "weekdays", "@weekdays" recurrence and sets initial dueDate', () => {
      // On Monday 2026-11-02, next weekday is today (2026-11-02)
      const res = extractDueDateToken('Review pull requests every weekday', undefined, fixedNow);
      expect(res.cleanText).toBe('Review pull requests');
      expect(res.repeat).toEqual({ type: 'weekdays' });
      expect(res.dueDate).toBe('2026-11-02');

      // If reference date is Saturday 2026-11-07, initial dueDate is Monday 2026-11-09
      const saturdayDate = new Date(2026, 10, 7);
      const resSat = extractDueDateToken('Review PRs @weekdays', undefined, saturdayDate);
      expect(resSat.dueDate).toBe('2026-11-09');

      // Multilingual weekdays
      expect(extractDueDateToken('Đọc sách mỗi ngày trong tuần', undefined, fixedNow)).toEqual({
        cleanText: 'Đọc sách',
        repeat: { type: 'weekdays' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Arbeiten jeden Werktag', undefined, fixedNow)).toEqual({
        cleanText: 'Arbeiten',
        repeat: { type: 'weekdays' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Travail tous les jours ouvrés', undefined, fixedNow)).toEqual({
        cleanText: 'Travail',
        repeat: { type: 'weekdays' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('Trabajar entre semana', undefined, fixedNow)).toEqual({
        cleanText: 'Trabajar',
        repeat: { type: 'weekdays' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('平日ジムに行く', undefined, fixedNow)).toEqual({
        cleanText: 'ジムに行く',
        repeat: { type: 'weekdays' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('평일 운동하기', undefined, fixedNow)).toEqual({
        cleanText: '운동하기',
        repeat: { type: 'weekdays' },
        dueDate: '2026-11-02',
      });
      expect(extractDueDateToken('工作日晨跑', undefined, fixedNow)).toEqual({
        cleanText: '晨跑',
        repeat: { type: 'weekdays' },
        dueDate: '2026-11-02',
      });
    });

    it('extracts "every <Weekday>" recurrence and calculates upcoming occurrence', () => {
      // On Monday 2026-11-02:
      // "every Tuesday" -> Tuesday is tomorrow (2026-11-03), dayOfWeek = 2
      const resTue = extractDueDateToken('Go to English class every Tuesday', undefined, fixedNow);
      expect(resTue.cleanText).toBe('Go to English class');
      expect(resTue.repeat).toEqual({ type: 'weekly', dayOfWeek: 2 });
      expect(resTue.dueDate).toBe('2026-11-03');

      // "every Monday" on Monday -> today (2026-11-02), dayOfWeek = 1
      const resMon = extractDueDateToken('Team retro every mon', undefined, fixedNow);
      expect(resMon.cleanText).toBe('Team retro');
      expect(resMon.repeat).toEqual({ type: 'weekly', dayOfWeek: 1 });
      expect(resMon.dueDate).toBe('2026-11-02');

      // Multilingual Vietnamese: "Học đàn mỗi thứ bảy" -> Saturday 2026-11-07, dayOfWeek = 6
      const resSat = extractDueDateToken('Học đàn mỗi thứ bảy', undefined, fixedNow);
      expect(resSat.cleanText).toBe('Học đàn');
      expect(resSat.repeat).toEqual({ type: 'weekly', dayOfWeek: 6 });
      expect(resSat.dueDate).toBe('2026-11-07');

      // Multilingual German, French, Spanish, Japanese, Korean, Chinese
      expect(extractDueDateToken('Hausputz jeden Samstag', undefined, fixedNow)).toEqual({
        cleanText: 'Hausputz',
        repeat: { type: 'weekly', dayOfWeek: 6 },
        dueDate: '2026-11-07',
      });
      expect(extractDueDateToken('Cours de piano chaque vendredi', undefined, fixedNow)).toEqual({
        cleanText: 'Cours de piano',
        repeat: { type: 'weekly', dayOfWeek: 5 },
        dueDate: '2026-11-06',
      });
      expect(extractDueDateToken('Comprar fruta cada martes', undefined, fixedNow)).toEqual({
        cleanText: 'Comprar fruta',
        repeat: { type: 'weekly', dayOfWeek: 2 },
        dueDate: '2026-11-03',
      });
      expect(extractDueDateToken('毎週水曜日ゴミ出し', undefined, fixedNow)).toEqual({
        cleanText: 'ゴミ出し',
        repeat: { type: 'weekly', dayOfWeek: 3 },
        dueDate: '2026-11-04',
      });
      expect(extractDueDateToken('매주 목요일 청소', undefined, fixedNow)).toEqual({
        cleanText: '청소',
        repeat: { type: 'weekly', dayOfWeek: 4 },
        dueDate: '2026-11-05',
      });
      expect(extractDueDateToken('每周日大扫除', undefined, fixedNow)).toEqual({
        cleanText: '大扫除',
        repeat: { type: 'weekly', dayOfWeek: 0 },
        dueDate: '2026-11-08',
      });
    });

    it('adds recurring reminder item with repeat property preserved', () => {
      let state = createInitialReminderState();
      state = addReminderItem(state, 'Water bonsai every day', fixedNowMs);
      const added = state.items[state.items.length - 1];
      expect(added.text).toBe('Water bonsai');
      expect(added.repeat).toEqual({ type: 'daily' });
      expect(added.dueDate).toBe('2026-11-02');
      expect(added.completed).toBe(false);
    });

    describe('computeNextRecurringDueDate', () => {
      it('computes daily next due date (+1 day)', () => {
        const next = computeNextRecurringDueDate({ type: 'daily' }, '2026-11-02', fixedNow);
        expect(next).toBe('2026-11-03');
      });

      it('computes weekdays next due date, rolling Friday to Monday (+3 days)', () => {
        // Monday -> Tuesday
        expect(computeNextRecurringDueDate({ type: 'weekdays' }, '2026-11-02', fixedNow)).toBe(
          '2026-11-03'
        );
        // Friday 2026-11-06 -> Monday 2026-11-09
        expect(computeNextRecurringDueDate({ type: 'weekdays' }, '2026-11-06', fixedNow)).toBe(
          '2026-11-09'
        );
      });

      it('computes weekly next due date (+7 days to next same weekday)', () => {
        // Tuesday 2026-11-03 -> Tuesday 2026-11-10
        expect(
          computeNextRecurringDueDate({ type: 'weekly', dayOfWeek: 2 }, '2026-11-03', fixedNow)
        ).toBe('2026-11-10');
      });

      it('rolls overdue recurring quests forward from today so they land in the future', () => {
        // Overdue daily task with dueDate 2026-10-25 when today is 2026-11-02 -> next due is tomorrow (2026-11-03)
        const next = computeNextRecurringDueDate({ type: 'daily' }, '2026-10-25', fixedNow);
        expect(next).toBe('2026-11-03');
      });
    });

    describe('Smart Rollover on Completion', () => {
      it('completes recurring quest with celebration trigger while rolling over dueDate and keeping completed: false', () => {
        let state = createInitialReminderState();
        state = addReminderItem(state, 'Feed bunny every day', fixedNowMs);
        const item = state.items[state.items.length - 1];
        expect(item.dueDate).toBe('2026-11-02');

        // Toggle completion
        const result = toggleReminderItem(state, item.id, fixedNow);
        // Celebrates completion
        expect(result.newlyCompleted).not.toBeNull();
        expect(result.newlyCompleted?.text).toBe('Feed bunny');

        // State remains active for next day
        const updatedItem = result.state.items.find((i) => i.id === item.id);
        expect(updatedItem?.completed).toBe(false);
        expect(updatedItem?.dueDate).toBe('2026-11-03');
        expect(updatedItem?.notifiedStages).toEqual([]);
      });

      it('toggles non-recurring quests normally (false -> true)', () => {
        let state = createInitialReminderState();
        state = addReminderItem(state, 'Buy new pencil', fixedNowMs);
        const item = state.items[state.items.length - 1];

        const result = toggleReminderItem(state, item.id, fixedNow);
        expect(result.newlyCompleted).not.toBeNull();
        const updatedItem = result.state.items.find((i) => i.id === item.id);
        expect(updatedItem?.completed).toBe(true);
      });
    });

    describe('JSON Serialization and Deserialization', () => {
      it('round-trips recurring quests through JSON cleanly', () => {
        let state = createInitialReminderState();
        state = addReminderItem(state, 'Yoga every Tuesday', fixedNowMs);

        const json = serializeRemindersJson(state);
        const restored = parseRemindersJson(json);
        const restoredItem = restored.items.find((i) => i.text === 'Yoga');
        expect(restoredItem?.repeat).toEqual({ type: 'weekly', dayOfWeek: 2 });
        expect(restoredItem?.dueDate).toBe('2026-11-03');
      });

      it('safely deserializes legacy JSON without repeat field', () => {
        const legacy = JSON.stringify({
          items: [{ id: '1', text: 'Classic task', completed: false, createdAtMs: 1 }],
        });
        const restored = parseRemindersJson(legacy);
        expect(restored.items[0].repeat).toBeUndefined();
      });

      it('resets notifiedStages on updateReminderDueDate', () => {
        let state = createInitialReminderState();
        state.items[0].dueDate = '2026-11-02';
        state.items[0].notifiedStages = ['evening-before', 'due-day'];

        state = updateReminderDueDate(state, state.items[0].id, '2026-11-05');
        expect(state.items[0].dueDate).toBe('2026-11-05');
        expect(state.items[0].notifiedStages).toEqual([]);
      });
    });
  });
});
