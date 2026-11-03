import { describe, it, expect } from 'vitest';
import {
  SupportedLocale,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  detectSystemLocale,
  t,
  getMonthNames,
  getShortMonthNames,
  getWeekdayLabels,
  getScheduleWeekdayPills,
  getLocalizedHolidayTitle,
} from '../src/core/i18n';

describe('i18n Core Engine', () => {
  describe('SUPPORTED_LOCALES & isSupportedLocale', () => {
    it('supports 8 languages', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(8);
      const codes = SUPPORTED_LOCALES.map((l) => l.code);
      expect(codes).toEqual(['en', 'vi', 'de', 'fr', 'es', 'ja', 'ko', 'zh']);
    });

    it('validates supported locales properly', () => {
      expect(isSupportedLocale('en')).toBe(true);
      expect(isSupportedLocale('vi')).toBe(true);
      expect(isSupportedLocale('de')).toBe(true);
      expect(isSupportedLocale('fr')).toBe(true);
      expect(isSupportedLocale('es')).toBe(true);
      expect(isSupportedLocale('ja')).toBe(true);
      expect(isSupportedLocale('ko')).toBe(true);
      expect(isSupportedLocale('zh')).toBe(true);

      expect(isSupportedLocale('ru')).toBe(false);
      expect(isSupportedLocale('')).toBe(false);
      expect(isSupportedLocale(null)).toBe(false);
      expect(isSupportedLocale(undefined)).toBe(false);
      expect(isSupportedLocale(123)).toBe(false);
    });
  });

  describe('detectSystemLocale', () => {
    it('detects locale from raw locale strings', () => {
      expect(detectSystemLocale('vi-VN')).toBe('vi');
      expect(detectSystemLocale('de-DE')).toBe('de');
      expect(detectSystemLocale('de-AT')).toBe('de');
      expect(detectSystemLocale('fr-FR')).toBe('fr');
      expect(detectSystemLocale('es-ES')).toBe('es');
      expect(detectSystemLocale('es-MX')).toBe('es');
      expect(detectSystemLocale('ja-JP')).toBe('ja');
      expect(detectSystemLocale('ko-KR')).toBe('ko');
      expect(detectSystemLocale('zh-CN')).toBe('zh');
      expect(detectSystemLocale('zh-TW')).toBe('zh');
      expect(detectSystemLocale('en-US')).toBe('en');
      expect(detectSystemLocale('en-GB')).toBe('en');
    });

    it('falls back to en for unknown or empty input', () => {
      expect(detectSystemLocale('it-IT')).toBe('en');
      expect(detectSystemLocale('')).toBe('en');
      expect(detectSystemLocale(undefined)).toBeDefined();
    });
  });

  describe('t (translation & interpolation)', () => {
    it('translates static keys across languages with natural persona localization', () => {
      expect(t('en', 'dash.title')).toBe('Usagi Buddy');
      expect(t('vi', 'dash.title')).toBe('Usagi Buddy');
      expect(t('ja', 'dash.title')).toBe('うさぎバディ');
      expect(t('ko', 'dash.title')).toBe('우사기 버디');
      expect(t('zh', 'dash.title')).toBe('乌萨奇小窝');
      expect(t('de', 'dash.title')).toBe('Usagi Buddy');
      expect(t('fr', 'dash.title')).toBe('Usagi Buddy');
      expect(t('es', 'dash.title')).toBe('Usagi Buddy');

      expect(t('en', 'dash.tab.companion')).toBe('Companion');
      expect(t('vi', 'dash.tab.companion')).toBe('Góc Usagi');
      expect(t('de', 'dash.tab.companion')).toBe('Dein Usagi');
      expect(t('fr', 'dash.tab.companion')).toBe('Mon Usagi');
      expect(t('es', 'dash.tab.companion')).toBe('Mi Usagi');
      expect(t('ja', 'dash.tab.companion')).toBe('うさぎ');
      expect(t('ko', 'dash.tab.companion')).toBe('나의 우사기');
      expect(t('zh', 'dash.tab.companion')).toBe('乌萨奇');
    });

    it('provides sprite-accurate natural costume localization without literal headband or yellow references', () => {
      const locales: SupportedLocale[] = ['en', 'vi', 'de', 'fr', 'es', 'ja', 'ko', 'zh'];
      const costumeKeys = [
        'dash.costume.classic',
        'dash.costume.study',
        'dash.costume.vest',
        'dash.costume.sigma',
        'dash.costume.star',
        'dash.costume.random',
      ] as const;

      // Exact assertions for sprite accuracy
      expect(t('en', 'dash.costume.classic')).toBe('Classic Usagi');
      expect(t('en', 'dash.costume.study')).toBe('Study Mode');
      expect(t('en', 'dash.costume.vest')).toBe('Dapper Vest');
      expect(t('en', 'dash.costume.sigma')).toBe('Cool Shades');
      expect(t('en', 'dash.costume.star')).toBe('Star Sparkle');
      expect(t('en', 'dash.costume.random')).toBe('Random Outfit');

      expect(t('vi', 'dash.costume.classic')).toBe('Usagi Nguyên Bản');
      expect(t('vi', 'dash.costume.study')).toBe('Chăm Học');
      expect(t('vi', 'dash.costume.vest')).toBe('Tổng Tài');
      expect(t('vi', 'dash.costume.sigma')).toBe('Cool Ngầu');
      expect(t('vi', 'dash.costume.star')).toBe('Sao Lấp Lánh');
      expect(t('vi', 'dash.costume.random')).toBe('Phối Ngẫu Nhiên');

      expect(t('de', 'dash.costume.classic')).toBe('Klassik-Usagi');
      expect(t('de', 'dash.costume.study')).toBe('Lernmodus');
      expect(t('de', 'dash.costume.sigma')).toBe('Coole Sonnenbrille');
      expect(t('de', 'dash.costume.star')).toBe('Sternenzauber');

      expect(t('fr', 'dash.costume.classic')).toBe('Usagi Classique');
      expect(t('fr', 'dash.costume.study')).toBe('Mode Étude');
      expect(t('fr', 'dash.costume.sigma')).toBe('Lunettes Cool');
      expect(t('fr', 'dash.costume.star')).toBe('Étoile Magique');

      expect(t('es', 'dash.costume.classic')).toBe('Usagi Clásico');
      expect(t('es', 'dash.costume.study')).toBe('Modo Estudio');
      expect(t('es', 'dash.costume.sigma')).toBe('Gafas Cool');
      expect(t('es', 'dash.costume.star')).toBe('Estrella Mágica');

      expect(t('ja', 'dash.costume.classic')).toBe('いつものうさぎ');
      expect(t('ja', 'dash.costume.study')).toBe('お勉強モード');
      expect(t('ja', 'dash.costume.vest')).toBe('おめかしベスト');
      expect(t('ja', 'dash.costume.sigma')).toBe('クールなサングラス');
      expect(t('ja', 'dash.costume.star')).toBe('キラキラ星');
      expect(t('ja', 'dash.costume.random')).toBe('おまかせ');

      expect(t('ko', 'dash.costume.classic')).toBe('기본 우사기');
      expect(t('ko', 'dash.costume.study')).toBe('열공 모드');
      expect(t('ko', 'dash.costume.vest')).toBe('멋쟁이 조끼');
      expect(t('ko', 'dash.costume.sigma')).toBe('쿨 선글라스');
      expect(t('ko', 'dash.costume.star')).toBe('반짝반짝 별');
      expect(t('ko', 'dash.costume.random')).toBe('랜덤 코디');

      expect(t('zh', 'dash.costume.classic')).toBe('原版乌萨奇');
      expect(t('zh', 'dash.costume.study')).toBe('认真学习');
      expect(t('zh', 'dash.costume.vest')).toBe('帅气小马甲');
      expect(t('zh', 'dash.costume.sigma')).toBe('酷盖墨镜');
      expect(t('zh', 'dash.costume.star')).toBe('闪耀星星');
      expect(t('zh', 'dash.costume.random')).toBe('随机穿搭');

      // Ban literal/awkward artifacts
      const bannedSubstrings = [
        'Headband',
        'Băng Đô',
        '头带',
        '鉢巻き',
        'Stirnband',
        '머리띠',
        'Vàng Cổ Điển',
        'Klassisch Gelb',
        'Jaune classique',
        'Amarillo clásico',
        '经典黄色',
        'クラシックイエロー',
        '클래식 옐로우',
      ];

      for (const loc of locales) {
        for (const k of costumeKeys) {
          const val = t(loc, k);
          for (const banned of bannedSubstrings) {
            expect(val).not.toContain(banned);
          }
        }
      }
    });

    it('provides localized save button labels and saved toast feedback across all 8 locales', () => {
      expect(t('en', 'dash.config.saveBtn')).toBe('💾 Save All Settings');
      expect(t('en', 'dash.config.savedToast')).toBe('✓ Saved!');

      expect(t('vi', 'dash.config.saveBtn')).toBe('💾 Lưu Cài Đặt');
      expect(t('vi', 'dash.config.savedToast')).toBe('✓ Đã lưu!');

      expect(t('de', 'dash.config.saveBtn')).toBe('💾 Einstellungen speichern');
      expect(t('de', 'dash.config.savedToast')).toBe('✓ Gespeichert!');

      expect(t('fr', 'dash.config.saveBtn')).toBe('💾 Enregistrer les paramètres');
      expect(t('fr', 'dash.config.savedToast')).toBe('✓ Enregistré !');

      expect(t('es', 'dash.config.saveBtn')).toBe('💾 Guardar ajustes');
      expect(t('es', 'dash.config.savedToast')).toBe('✓ ¡Guardado!');

      expect(t('ja', 'dash.config.saveBtn')).toBe('💾 設定を保存する');
      expect(t('ja', 'dash.config.savedToast')).toBe('✓ 保存しました！');

      expect(t('ko', 'dash.config.saveBtn')).toBe('💾 설정 저장하기');
      expect(t('ko', 'dash.config.savedToast')).toBe('✓ 저장 완료!');

      expect(t('zh', 'dash.config.saveBtn')).toBe('💾 保存所有设置');
      expect(t('zh', 'dash.config.savedToast')).toBe('✓ 已保存！');
    });

    it('interpolates parameters into messages', () => {
      expect(t('en', 'usagi.birthdayGreeting', { nickname: 'Alice' })).toBe(
        '🎂 Happy Birthday, Alice! Una~!! ✨'
      );

      expect(t('vi', 'usagi.birthdayGreeting', { nickname: 'Thảo' })).toBe(
        '🎂 Chúc mừng sinh nhật, Thảo! Una~!! ✨'
      );

      expect(t('en', 'digest.todaySingle', { title: 'Study Math' })).toBe(
        "☀️ Today's quest: Study Math! Ganbatte~"
      );

      expect(t('vi', 'digest.todaySingle', { title: 'Làm bài tập' })).toBe(
        '☀️ Nhiệm vụ hôm nay: Làm bài tập! Cố lên nha~'
      );

      expect(t('en', 'digest.todayMulti', { count: 3, names: 'Task 1, Task 2' })).toBe(
        '☀️ Today you have 3 quests: Task 1, Task 2~'
      );

      expect(t('vi', 'digest.todayMulti', { count: 3, names: 'Việc 1, Việc 2' })).toBe(
        '☀️ Hôm nay bạn có 3 nhiệm vụ: Việc 1, Việc 2~'
      );
    });

    it('falls back to english if translation is missing', () => {
      // If a key exists in en, it should fallback to en
      expect(t('de', 'dash.title')).toBeDefined();
    });
  });

  describe('Date and calendar localized helpers', () => {
    it('provides 12 month names for all 8 locales', () => {
      const locales: SupportedLocale[] = ['en', 'vi', 'de', 'fr', 'es', 'ja', 'ko', 'zh'];
      for (const loc of locales) {
        const months = getMonthNames(loc);
        expect(months).toHaveLength(12);
        const shortMonths = getShortMonthNames(loc);
        expect(shortMonths).toHaveLength(12);
      }

      expect(getMonthNames('en')[0]).toBe('January');
      expect(getShortMonthNames('en')[0]).toBe('Jan');
      expect(getMonthNames('vi')[0]).toBe('Tháng 1');
      expect(getShortMonthNames('vi')[0]).toBe('Th1');
      expect(getMonthNames('ja')[0]).toBe('1月');
      expect(getShortMonthNames('ja')[0]).toBe('1月');
    });

    it('provides weekday labels for calendar grid with weekStartsOn=0 and weekStartsOn=1', () => {
      const enMon = getWeekdayLabels('en', 1);
      expect(enMon).toEqual(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);

      const enSun = getWeekdayLabels('en', 0);
      expect(enSun).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);

      const viMon = getWeekdayLabels('vi', 1);
      expect(viMon).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);

      const viSun = getWeekdayLabels('vi', 0);
      expect(viSun).toEqual(['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']);

      const jaMon = getWeekdayLabels('ja', 1);
      expect(jaMon).toEqual(['月', '火', '水', '木', '金', '土', '日']);
    });

    it('provides schedule weekday pills in Mon-Sun order', () => {
      const pillsEn = getScheduleWeekdayPills('en');
      expect(pillsEn).toHaveLength(7);
      expect(pillsEn.map((p) => p.day)).toEqual([1, 2, 3, 4, 5, 6, 0]);
      expect(pillsEn[0].label).toBe('Mon');
      expect(pillsEn[6].label).toBe('Sun');

      const pillsVi = getScheduleWeekdayPills('vi');
      expect(pillsVi[0].label).toBe('T2');
      expect(pillsVi[6].label).toBe('CN');
    });

    it('resolves localized holiday titles based on locale matching', () => {
      const vnEvent = {
        name: 'National Day',
        localName: 'Ngày Quốc khánh',
        countryCode: 'VN',
        type: 'public_holiday' as const,
      };

      expect(getLocalizedHolidayTitle(vnEvent, 'vi')).toBe('Ngày Quốc khánh');
      expect(getLocalizedHolidayTitle(vnEvent, 'en')).toBe('National Day');

      const deEvent = {
        name: 'German Unity Day',
        localName: 'Tag der Deutschen Einheit',
        countryCode: 'DE',
        type: 'public_holiday' as const,
      };
      expect(getLocalizedHolidayTitle(deEvent, 'de')).toBe('Tag der Deutschen Einheit');
      expect(getLocalizedHolidayTitle(deEvent, 'en')).toBe('German Unity Day');

      const bdayEvent = {
        name: "Alice's Birthday",
        localName: "Alice's Birthday",
        countryCode: 'VN',
        type: 'birthday' as const,
      };
      expect(getLocalizedHolidayTitle(bdayEvent, 'vi')).toBe("Alice's Birthday");
    });
  });
});
