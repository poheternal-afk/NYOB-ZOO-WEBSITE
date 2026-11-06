/**
 * ============================================================================
 * TRILINGUO / NYOB ZOO — HMONG LINGUISTIC ENGINE & 3-WAY DICTIONARY
 * Source Reference: Learn-Hmong-the-Jay-Way (1).pdf (Jay Xiong)
 * Supports 3-way translation & lookup: English (en) <-> Vietnamese/Kinh (vi) <-> Hmong (hmn)
 * ============================================================================
 */

(function (global) {
  'use strict';

  /**
   * 1. HMONG RPA TONE MARKERS (8 Tones - "Koj Mus Kuv Niam Neeg Siab Zoo Tod")
   * Extracted from Learn-Hmong-the-Jay-Way (1).pdf (Pages 10-16)
   */
  const HMONG_TONES = {
    b: { code: '-b', nameEn: 'High pitch (YO-)', nameVi: 'Thanh cao (-b)', nameHmn: 'Suab siab (-b)', guide: 'High level pitch' },
    j: { code: '-j', nameEn: 'High falling (hey!)', nameVi: 'Thanh cao hạ (-j)', nameHmn: 'Suab nqis siab (-j)', guide: 'High falling exclamation' },
    v: { code: '-v', nameEn: 'Rising (SEC-)', nameVi: 'Thanh hỏi/lên (-v)', nameHmn: 'Suab nce (-v)', guide: 'Mid-to-high rising pitch' },
    s: { code: '-s', nameEn: 'Mid-low tone (Doe)', nameVi: 'Thanh trung trầm (-s)', nameHmn: 'Suab qis (-s)', guide: 'Lower-mid level pitch' },
    g: { code: '-g', nameEn: 'Falling breathy (-tion)', nameVi: 'Thanh huyền thở (-g)', nameHmn: 'Suab ua pa (-g)', guide: 'Breathy falling tone' },
    m: { code: '-m', nameEn: 'Low creaky (-yo)', nameVi: 'Thanh nặng nghẹn (-m)', nameHmn: 'Suabบีบ (-m)', guide: 'Short low glottal/creaky tone' },
    d: { code: '-d', nameEn: 'Low rising (-d)', nameVi: 'Thanh trầm lên (-d)', nameHmn: 'Suab nce qis (-d)', guide: 'Variant of -m with rising tail' },
    none: { code: 'Ø', nameEn: 'Mid-high level (Re)', nameVi: 'Thanh ngang (không dấu)', nameHmn: 'Suab nrab (tsis muaj cim)', guide: 'Natural mid-high speaking voice' }
  };

  /**
   * 2. PARTS OF SPEECH KEYS FROM PDF (Page 56)
   */
  const POS_LABELS = {
    u: { code: '(u) ua', en: 'Verb · (u) ua', vi: 'Động từ · (u) ua', hmn: 'Lo lus ua (u)' },
    y: { code: '(y) yam', en: 'Noun · (y) yam', vi: 'Danh từ · (y) yam', hmn: 'Lo lus yam (y)' },
    p: { code: '(p) piav yam', en: 'Adjective · (p) piav yam', vi: 'Tính từ · (p) piav yam', hmn: 'Piav yam (p)' },
    pu: { code: '(pu) piav ua', en: 'Adverb · (pu) piav ua', vi: 'Trạng từ · (pu) piav ua', hmn: 'Piav ua (pu)' },
    t: { code: '(t) tswv', en: 'Pronoun · (t) tswv', vi: 'Đại từ · (t) tswv', hmn: 'Lo lus tswv (t)' },
    h: { code: '(h) hom', en: 'Classifier · (h) hom', vi: 'Loại từ · (h) hom', hmn: 'Lo lus hom (h)' },
    r: { code: '(r) rau', en: 'Preposition · (r) rau', vi: 'Giới từ · (r) rau', hmn: 'Lo lus rau (r)' },
    tx: { code: '(tx) txuas', en: 'Conjunction · (tx) txuas', vi: 'Liên từ · (tx) txuas', hmn: 'Lo lus txuas (tx)' },
    nth: { code: '(nth) nthe', en: 'Expression · (nth) nthe', vi: 'Thán từ / Cụm giao tiếp · (nth)', hmn: 'Kab lus sib fim (nth)' }
  };

  /**
   * 3. CORE 3-WAY DICTIONARY (Vocabulary + Expressions from Learn-Hmong-the-Jay-Way PDF)
   */
  const DICTIONARY = [
    // --- GREETINGS & POLITENESS ---
    {
      id: 'w_nyob_zoo',
      hmn: 'Nyob zoo',
      en: 'Hello / Good day',
      vi: 'Xin chào / Chào bạn',
      phonetic: 'nyaw zhong',
      pos: 'nth',
      note: 'Literally "stay good/well". Universal Hmong greeting at any time of day (PDF p.92).',
      exampleHmn: 'Nyob zoo! Koj nyob li cas?',
      exampleVi: 'Xin chào! Bạn khỏe không?',
      exampleEn: 'Hello! How are you?'
    },
    {
      id: 'w_ua_tsaug',
      hmn: 'Ua tsaug',
      en: 'Thank you',
      vi: 'Cảm ơn',
      phonetic: 'oua chao',
      pos: 'nth',
      note: 'Add "ntau" (Ua tsaug ntau) for "Thank you very much" (PDF p.55, 92).',
      exampleHmn: 'Ua tsaug ntau rau koj kev pab.',
      exampleVi: 'Cảm ơn nhiều vì sự giúp đỡ của bạn.',
      exampleEn: 'Thank you very much for your help.'
    },
    {
      id: 'w_ua_tsaug_ntau',
      hmn: 'Ua tsaug ntau',
      en: 'Thank you very much',
      vi: 'Cảm ơn rất nhiều',
      phonetic: 'oua chao ndao',
      pos: 'nth',
      note: '"ntau" means many/much (PDF p.93).',
      exampleHmn: 'Ua tsaug ntau nawb!',
      exampleVi: 'Cảm ơn rất nhiều nhé!',
      exampleEn: 'Thank you very much!'
    },
    {
      id: 'w_tsis_ua_li_cas',
      hmn: 'Tsis ua li cas',
      en: "You're welcome / No problem",
      vi: 'Không có gì / Đừng ngại',
      phonetic: 'chee oua lee cha',
      pos: 'nth',
      note: 'Literally "does not do anything/matter" (PDF p.94).',
      exampleHmn: 'Tsis ua li cas, peb yog phooj ywg.',
      exampleVi: 'Không có gì, chúng ta là bạn bè mà.',
      exampleEn: "You're welcome, we are friends."
    },
    {
      id: 'w_koj_nyob_li_cas',
      hmn: 'Koj nyob li cas?',
      en: 'How are you?',
      vi: 'Bạn khỏe không? / Bạn thế nào?',
      phonetic: 'kaw nyaw lee cha',
      pos: 'nth',
      note: '"Koj" (you) + "nyob" (stay/live) + "li cas" (how) (PDF p.93).',
      exampleHmn: 'Hnub no koj nyob li cas?',
      exampleVi: 'Hôm nay bạn thế nào?',
      exampleEn: 'How are you doing today?'
    },
    {
      id: 'w_kuv_nyob_zoo',
      hmn: 'Kuv nyob zoo',
      en: 'I am fine / I am doing well',
      vi: 'Tôi khỏe / Tôi vẫn tốt',
      phonetic: 'koo nyaw zhong',
      pos: 'nth',
      note: 'Standard response to "Koj nyob li cas?" (PDF p.93).',
      exampleHmn: 'Kuv nyob zoo, ua tsaug.',
      exampleVi: 'Tôi khỏe, cảm ơn bạn.',
      exampleEn: 'I am fine, thank you.'
    },
    {
      id: 'w_mus_zoo',
      hmn: 'Mus zoo',
      en: 'Goodbye / Safe travels',
      vi: 'Tạm biệt / Đi thượng lộ bình an',
      phonetic: 'moo zhong',
      pos: 'nth',
      note: 'Said to the person leaving: "Go well" (Mus zoo koj) (PDF p.93).',
      exampleHmn: 'Mus zoo koj nawb, sis ntsib dua!',
      exampleVi: 'Bạn đi bình an nhé, hẹn gặp lại!',
      exampleEn: 'Safe travels, see you again!'
    },
    {
      id: 'w_sis_ntsib_dua',
      hmn: 'Sis ntsib dua',
      en: 'See you again',
      vi: 'Hẹn gặp lại',
      phonetic: 'shee jee doua',
      pos: 'nth',
      note: 'Also spelled "Sib ntsib dua" (PDF p.94, 152).',
      exampleHmn: 'Tag kis peb sis ntsib dua.',
      exampleVi: 'Ngày mai chúng ta gặp lại nhé.',
      exampleEn: 'See you again tomorrow.'
    },
    {
      id: 'w_thov_zam_txim',
      hmn: 'Thov zam txim',
      en: 'Excuse me / I apologize',
      vi: 'Xin lỗi / Xin thứ lỗi',
      phonetic: 'thaw za tsee',
      pos: 'nth',
      note: 'Polite phrase for asking pardon or getting attention (PDF p.111).',
      exampleHmn: 'Thov zam txim, chav dej nyob qhov twg?',
      exampleVi: 'Xin lỗi, nhà vệ sinh ở đâu vậy?',
      exampleEn: 'Excuse me, where is the restroom?'
    },
    {
      id: 'w_zoo_siab_ntsib_koj',
      hmn: 'Zoo siab tau ntsib koj',
      en: 'Nice to meet you',
      vi: 'Rất vui được gặp bạn',
      phonetic: 'zhong shia tao jee kaw',
      pos: 'nth',
      note: '"Zoo siab" (happy/glad) + "tau ntsib" (got to meet) + "koj" (you) (PDF p.93).',
      exampleHmn: 'Kuv zoo siab tau ntsib koj nyob Tả Van.',
      exampleVi: 'Tôi rất vui được gặp bạn ở Tả Van.',
      exampleEn: 'I am happy to meet you in Ta Van.'
    },

    // --- PRONOUNS (PDF Page 63-64) ---
    { id: 'w_kuv', hmn: 'kuv', en: 'I / me / my', vi: 'tôi / của tôi', phonetic: 'koo', pos: 't', note: 'First-person singular pronoun (PDF p.63).', exampleHmn: 'Kuv yog neeg Hmoob.', exampleVi: 'Tôi là người Hmong.', exampleEn: 'I am Hmong.' },
    { id: 'w_koj', hmn: 'koj', en: 'you / your', vi: 'bạn / của bạn', phonetic: 'kaw', pos: 't', note: 'Second-person singular pronoun (PDF p.63).', exampleHmn: 'Koj lub npe hu li cas?', exampleVi: 'Tên của bạn là gì?', exampleEn: 'What is your name?' },
    { id: 'w_peb', hmn: 'peb', en: 'we / us / our (3+)', vi: 'chúng tôi / chúng ta', phonetic: 'peh', pos: 't', note: 'First-person plural (3 or more people); also means number 3 (PDF p.63).', exampleHmn: 'Peb sib to taub.', exampleVi: 'Chúng ta hiểu nhau.', exampleEn: 'We understand each other.' },
    { id: 'w_wb', hmn: 'wb', en: 'we two / both of us', vi: 'hai chúng ta', phonetic: 'ew', pos: 't', note: 'Dual pronoun for exactly 2 people including speaker (PDF p.63).', exampleHmn: 'Wb mus ua ke.', exampleVi: 'Hai chúng ta đi cùng nhau.', exampleEn: 'The two of us go together.' },
    { id: 'w_nws', hmn: 'nws', en: 'he / she / it', vi: 'anh ấy / cô ấy / nó', phonetic: 'new', pos: 't', note: 'Third-person singular gender-neutral pronoun (PDF p.63).', exampleHmn: 'Nws hais lus Hmoob.', exampleVi: 'Anh/cô ấy nói tiếng Hmong.', exampleEn: 'He/she speaks Hmong.' },
    { id: 'w_lawv', hmn: 'lawv', en: 'they / them / their', vi: 'họ / của họ', phonetic: 'ler', pos: 't', note: 'Third-person plural (3 or more) (PDF p.63).', exampleHmn: 'Lawv nyob hauv lub zos.', exampleVi: 'Họ sống trong bản.', exampleEn: 'They live in the village.' },
    { id: 'w_nej', hmn: 'nej', en: 'you all (3+)', vi: 'các bạn', phonetic: 'nay', pos: 't', note: 'Second-person plural (3 or more) (PDF p.63).', exampleHmn: 'Nej tuaj qhov twg tuaj?', exampleVi: 'Các bạn từ đâu đến?', exampleEn: 'Where do you all come from?' },

    // --- CLASSIFIERS (PDF Page 67-69) ---
    { id: 'w_lub', hmn: 'lub', en: 'classifier (round/bulky objects, places)', vi: 'cái / quả / ngôi (loại từ)', phonetic: 'loo', pos: 'h', note: 'Most common Hmong classifier: used for houses (lub tsev), villages (lub zos), names (lub npe), fruits (PDF p.67).', exampleHmn: 'Lub tsev no zoo nkauj heev.', exampleVi: 'Ngôi nhà này rất đẹp.', exampleEn: 'This house is very beautiful.' },
    { id: 'w_tus', hmn: 'tus', en: 'classifier (people, animals, long things)', vi: 'người / con / cây (loại từ)', phonetic: 'too', pos: 'h', note: 'Used for living beings, rivers, roads, and cylindrical items (PDF p.67).', exampleHmn: 'Tus dev thiab tus nyuj.', exampleVi: 'Con chó và con trâu/bò.', exampleEn: 'The dog and the cow/buffalo.' },
    { id: 'w_daim', hmn: 'daim', en: 'classifier (flat objects, clothes, land)', vi: 'tấm / mảnh / chiếc (loại từ)', phonetic: 'dai', pos: 'h', note: 'Used for flat surfaces: daim tiab (skirt), daim pam (blanket), daim liaj (paddy field) (PDF p.67).', exampleHmn: 'Daim tiab Hmoob paj ntaub.', exampleVi: 'Chiếc váy thổ cẩm Hmong.', exampleEn: 'Hmong embroidered skirt.' },
    { id: 'w_cov', hmn: 'cov', en: 'plural marker (group/these)', vi: 'những / các', phonetic: 'chaw', pos: 'h', note: 'Turns any noun into plural regardless of singular classifier (PDF p.68).', exampleHmn: 'Cov lus uas xav txhais.', exampleVi: 'Những từ muốn dịch.', exampleEn: 'The words you want to translate.' },

    // --- COMMON VERBS (PDF Pages 56-62, 130-145) ---
    { id: 'w_hais', hmn: 'hais', en: 'speak / say', vi: 'nói', phonetic: 'hai', pos: 'u', note: 'Often paired as "hais lus" (speak language/words) (PDF p.58).', exampleHmn: 'Maj mam hais lus.', exampleVi: 'Xin hãy nói chậm rãi.', exampleEn: 'Please speak slowly.' },
    { id: 'w_txhais', hmn: 'txhais', en: 'translate / meaning', vi: 'dịch / giải nghĩa', phonetic: 'tsai', pos: 'u', note: 'Txhais lus = translate language.', exampleHmn: 'Txhais tam sim no.', exampleVi: 'Dịch ngay bây giờ.', exampleEn: 'Translate right now.' },
    { id: 'w_mloog', hmn: 'mloog', en: 'listen / hear', vi: 'nghe / lắng nghe', phonetic: 'mlong', pos: 'u', note: 'Mloog cov lus sau = listen to the written words (PDF p.59).', exampleHmn: 'Mloog lub suab Hmoob.', exampleVi: 'Nghe âm thanh tiếng Hmong.', exampleEn: 'Listen to the Hmong sound.' },
    { id: 'w_kawm', hmn: 'kawm', en: 'learn / study', vi: 'học / học tập', phonetic: 'ker', pos: 'u', note: 'Kawm lus Hmoob = learn Hmong language (PDF p.58).', exampleHmn: 'Kuv xav kawm lus Hmoob.', exampleVi: 'Tôi muốn học tiếng Hmong.', exampleEn: 'I want to learn Hmong.' },
    { id: 'w_paub', hmn: 'paub', en: 'know / understand', vi: 'biết', phonetic: 'pao', pos: 'u', note: 'Kuv paub = I know; Kuv tsis paub = I do not know (PDF p.60).', exampleHmn: 'Kuv paub me me xwb.', exampleVi: 'Tôi chỉ biết một chút thôi.', exampleEn: 'I only know a little bit.' },
    { id: 'w_to_taub', hmn: 'to taub', en: 'understand / comprehend', vi: 'hiểu / thấu hiểu', phonetic: 'taw tao', pos: 'u', note: 'Peb sib to taub = we understand each other (Hero motto).', exampleHmn: 'Koj puas to taub kuv hais?', exampleVi: 'Bạn có hiểu tôi nói không?', exampleEn: 'Do you understand what I say?' },
    { id: 'w_pab', hmn: 'pab', en: 'help / assist', vi: 'giúp đỡ', phonetic: 'pah', pos: 'u', note: 'Lo lus pab peb sib to taub = Words help us understand each other (PDF p.60).', exampleHmn: 'Thov koj pab kuv.', exampleVi: 'Xin bạn hãy giúp tôi.', exampleEn: 'Please help me.' },
    { id: 'w_mus', hmn: 'mus', en: 'go / walk / travel', vi: 'đi', phonetic: 'moo', pos: 'u', note: 'Core motion verb (PDF p.59).', exampleHmn: 'Koj yuav mus qhov twg?', exampleVi: 'Bạn sẽ đi đâu?', exampleEn: 'Where are you going?' },
    { id: 'w_tuaj', hmn: 'tuaj', en: 'come / arrive', vi: 'đến / tới', phonetic: 'toua', pos: 'u', note: 'Indicates movement toward the speaker (PDF p.62).', exampleHmn: 'Zoo siab txais tos koj tuaj.', exampleVi: 'Chào mừng bạn đã đến.', exampleEn: 'Welcome on your arrival.' },
    { id: 'w_noj', hmn: 'noj', en: 'eat', vi: 'ăn', phonetic: 'naw', pos: 'u', note: 'Noj mov = eat rice/meal (PDF p.60).', exampleHmn: 'Koj puas tau noj mov?', exampleVi: 'Bạn đã ăn cơm chưa?', exampleEn: 'Have you eaten a meal yet?' },
    { id: 'w_haus', hmn: 'haus', en: 'drink', vi: 'uống', phonetic: 'hao', pos: 'u', note: 'Haus dej = drink water (PDF p.58).', exampleHmn: 'Thov muab ib khob dej kub haus.', exampleVi: 'Cho tôi xin một cốc nước nóng để uống.', exampleEn: 'Please give me a cup of hot water to drink.' },
    { id: 'w_yuav', hmn: 'yuav', en: 'buy / want / will (future)', vi: 'mua / muốn / sẽ', phonetic: 'youa', pos: 'u', note: 'Acts as verb "to buy" and future auxiliary "will" (PDF p.62, 179).', exampleHmn: 'Kuv xav yuav daim tiab no.', exampleVi: 'Tôi muốn mua chiếc váy này.', exampleEn: 'I want to buy this skirt.' },
    { id: 'w_muag', hmn: 'muag', en: 'sell', vi: 'bán', phonetic: 'moua', pos: 'u', note: 'Koj muag pes tsawg? = How much do you sell this for? (PDF p.179).', exampleHmn: 'Daim paj ntaub no muag pes tsawg?', exampleVi: 'Tấm thổ cẩm này bán bao nhiêu?', exampleEn: 'How much does this embroidered cloth sell for?' },
    { id: 'w_xav', hmn: 'xav', en: 'want / think / wish', vi: 'muốn / nghĩ', phonetic: 'sa', pos: 'u', note: 'Kuv xav = I want / I think (PDF p.62).', exampleHmn: 'Kuv xav mus saib lub liaj.', exampleVi: 'Tôi muốn đi xem ruộng bậc thang.', exampleEn: 'I want to go see the terraced fields.' },
    { id: 'w_pw', hmn: 'pw', en: 'sleep / lie down', vi: 'ngủ / nằm', phonetic: 'pew', pos: 'u', note: 'Chav pw = bedroom (PDF p.60).', exampleHmn: ' Hmo no peb pw nyob homestay.', exampleVi: 'Tối nay chúng tôi ngủ ở homestay.', exampleEn: 'Tonight we sleep at the homestay.' },

    // --- FOOD, HOMESTAY, NATURE & VILLAGE NOUNS (PDF Pages 77-90) ---
    { id: 'w_lus', hmn: 'lus', en: 'word / language / speech', vi: 'từ / lời nói / ngôn ngữ', phonetic: 'loo', pos: 'y', note: 'Lo lus = a word; Lus Hmoob = Hmong language; Lus Askiv = English; Lus Nyab Laj (Kinh) = Vietnamese.', exampleHmn: 'Lus zoo los ntawm Tả Van.', exampleVi: 'Lời hay từ bản Tả Van.', exampleEn: 'Kind words from Ta Van.' },
    { id: 'w_mov', hmn: 'mov', en: 'cooked rice / meal', vi: 'cơm / bữa ăn', phonetic: 'maw', pos: 'y', note: 'Mov nplaum = sticky rice (xôi); mov kib = fried rice (PDF p.85).', exampleHmn: 'Mov nplaum qab heev.', exampleVi: 'Xôi ngon lắm.', exampleEn: 'The sticky rice is very delicious.' },
    { id: 'w_dej', hmn: 'dej', en: 'water', vi: 'nước', phonetic: 'day', pos: 'y', note: 'Dej kub = hot water; dej txias = cold water (PDF p.85).', exampleHmn: 'Kuv xav haus dej.', exampleVi: 'Tôi muốn uống nước.', exampleEn: 'I want to drink water.' },
    { id: 'w_nqaij', hmn: 'nqaij', en: 'meat', vi: 'thịt', phonetic: 'ngai', pos: 'y', note: 'Nqaij npuas = pork, nqaij nyuj = beef, nqaij qaib = chicken (PDF p.85).', exampleHmn: 'Nqaij qaib hau qab heev.', exampleVi: 'Thịt gà luộc rất ngon.', exampleEn: 'Boiled chicken meat is very tasty.' },
    { id: 'w_zaub', hmn: 'zaub', en: 'vegetable / greens', vi: 'rau', phonetic: 'zao', pos: 'y', note: 'Fresh mountain greens (PDF p.85).', exampleHmn: 'Peb noj zaub ntsuab.', exampleVi: 'Chúng tôi ăn rau xanh.', exampleEn: 'We eat green vegetables.' },
    { id: 'w_tsev', hmn: 'tsev', en: 'house / home / homestay', vi: 'nhà / homestay', phonetic: 'cheh', pos: 'y', note: 'Lub tsev = the house (PDF p.81).', exampleHmn: 'Koj lub tsev nyob qhov twg?', exampleVi: 'Nhà của bạn ở đâu?', exampleEn: 'Where is your house?' },
    { id: 'w_chav_dej', hmn: 'chav dej', en: 'bathroom / restroom', vi: 'nhà vệ sinh / phòng tắm', phonetic: 'cha day', pos: 'y', note: 'Essential travel noun (PDF p.111).', exampleHmn: 'Chav dej nyob sab xis.', exampleVi: 'Nhà vệ sinh ở bên phải.', exampleEn: 'The bathroom is on the right.' },
    { id: 'w_roob', hmn: 'roob', en: 'mountain', vi: 'núi', phonetic: 'rong', pos: 'y', note: 'Lub roob = the mountain (PDF p.88).', exampleHmn: 'Lub roob nyob Tả Van siab heev.', exampleVi: 'Ngọn núi ở Tả Van rất cao.', exampleEn: 'The mountain in Ta Van is very high.' },
    { id: 'w_liaj', hmn: 'liaj', en: 'terraced rice paddy field', vi: 'ruộng bậc thang / ruộng lúa', phonetic: 'lia', pos: 'y', note: 'Daim liaj = rice paddy terrace (PDF p.88).', exampleHmn: 'Cov liaj nyob Tả Van zoo nkauj kawg.', exampleVi: 'Những thửa ruộng bậc thang ở Tả Van đẹp tuyệt vời.', exampleEn: 'The terraced fields in Ta Van are gorgeous.' },
    { id: 'w_zos', hmn: 'zos', en: 'village', vi: 'bản làng / thôn xóm', phonetic: 'zaw', pos: 'y', note: 'Lub zos = the village.', exampleHmn: 'Zoo siab txais tos rau peb lub zos.', exampleVi: 'Chào mừng đến với bản làng của chúng tôi.', exampleEn: 'Welcome to our village.' },
    { id: 'w_nyiaj', hmn: 'nyiaj', en: 'money / silver', vi: 'tiền / bạc', phonetic: 'nyia', pos: 'y', note: 'Used for currency and traditional Hmong silver jewelry (PDF p.82).', exampleHmn: 'Tus nqi yog pes tsawg nyiaj?', exampleVi: 'Giá bao nhiêu tiền?', exampleEn: 'How much money is the price?' },
    { id: 'w_paj_ntaub', hmn: 'paj ntaub', en: 'embroidered cloth / batik textile', vi: 'thổ cẩm / vải thêu hoa', phonetic: 'pa ndao', pos: 'y', note: 'Literally "flower cloth", traditional Hmong textile art.', exampleHmn: 'Daim paj ntaub no ua los ntawm tes.', exampleVi: 'Tấm thổ cẩm này được làm thủ công bằng tay.', exampleEn: 'This flower cloth is handmade.' },
    { id: 'w_tshuaj', hmn: 'tshuaj', en: 'medicine / herbal remedy', vi: 'thuốc', phonetic: 'choua', pos: 'y', note: 'Haus tshuaj = take medicine (PDF p.113).', exampleHmn: 'Kuv xav yuav tshuaj kho mob plab.', exampleVi: 'Tôi muốn mua thuốc đau bụng.', exampleEn: 'I want to buy medicine for a stomachache.' },

    // --- ADJECTIVES & DESCRIPTORS (PDF Pages 65-66) ---
    { id: 'w_zoo', hmn: 'zoo', en: 'good / well / fine', vi: 'tốt / hay / đẹp', phonetic: 'zhong', pos: 'p', note: 'Zoo nkauj = pretty/scenic; zoo siab = happy (PDF p.65).', exampleHmn: 'Hnub no huab cua zoo heev.', exampleVi: 'Hôm nay thời tiết rất đẹp.', exampleEn: 'Today the weather is very nice.' },
    { id: 'w_zoo_nkauj', hmn: 'zoo nkauj', en: 'beautiful / scenic / pretty', vi: 'đẹp / xinh đẹp', phonetic: 'zhong ngao', pos: 'p', note: 'Used for scenery, textiles, and women (PDF p.66).', exampleHmn: 'Tả Van zoo nkauj heev!', exampleVi: 'Tả Van đẹp lắm!', exampleEn: 'Ta Van is very beautiful!' },
    { id: 'w_qab', hmn: 'qab', en: 'delicious / tasty / sweet', vi: 'ngon / ngọt', phonetic: 'kah', pos: 'p', note: 'Qab heev = very delicious (PDF p.65).', exampleHmn: 'Zaub mov Hmoob qab heev.', exampleVi: 'Món ăn Hmong rất ngon.', exampleEn: 'Hmong food is very delicious.' },
    { id: 'w_kim', hmn: 'kim', en: 'expensive', vi: 'đắt', phonetic: 'kee', pos: 'p', note: 'Kim heev = very expensive (PDF p.65, 179).', exampleHmn: 'Kim me ntsis, txo nqi puas tau?', exampleVi: 'Hơi đắt một chút, bớt giá được không?', exampleEn: 'A bit expensive, can you lower the price?' },
    { id: 'w_pheej_yig', hmn: 'pheej yig', en: 'cheap / affordable', vi: 'rẻ / hợp lý', phonetic: 'pheng yee', pos: 'p', note: 'Opposite of kim (PDF p.65).', exampleHmn: 'Tus nqi no pheej yig kawg.', exampleVi: 'Mức giá này rất rẻ.', exampleEn: 'This price is very affordable.' },
    { id: 'w_kub', hmn: 'kub', en: 'hot', vi: 'nóng', phonetic: 'koo', pos: 'p', note: 'Dej kub = hot water (PDF p.65).', exampleHmn: 'Khob dej no kub heev.', exampleVi: 'Cốc nước này nóng lắm.', exampleEn: 'This cup of water is very hot.' },
    { id: 'w_no', hmn: 'no', en: 'cold (weather) / this', vi: 'lạnh / này', phonetic: 'naw', pos: 'p', note: 'Hnub no no heev = Today is very cold (PDF p.65).', exampleHmn: 'Saum roob no me ntsis.', exampleVi: 'Trên núi hơi lạnh một chút.', exampleEn: 'Up on the mountain it is a bit cold.' },
    { id: 'w_deb', hmn: 'deb', en: 'far', vi: 'xa', phonetic: 'deh', pos: 'p', note: 'Deb npaum li cas? = How far is it? (PDF p.111).', exampleHmn: 'Puas deb ntawm no?', exampleVi: 'Có xa đây không?', exampleEn: 'Is it far from here?' },
    { id: 'w_ze', hmn: 'ze', en: 'near / close', vi: 'gần', phonetic: 'zeh', pos: 'p', note: 'Ze ze xwb = Very close by (PDF p.111).', exampleHmn: 'Lub homestay nyob ze ze no xwb.', exampleVi: 'Homestay ở ngay gần đây thôi.', exampleEn: 'The homestay is right near here.' },

    // --- NUMBERS 1-10 & 100 (PDF Pages 70-73) ---
    { id: 'w_ib', hmn: 'ib', en: 'one (1)', vi: 'một (1)', phonetic: 'ee', pos: 'p', note: 'Number 1 (PDF p.70).', exampleHmn: 'Ib yam pes tsawg?', exampleVi: 'Một món giá bao nhiêu?', exampleEn: 'How much for one item?' },
    { id: 'w_ob', hmn: 'ob', en: 'two (2)', vi: 'hai (2)', phonetic: 'aw', pos: 'p', note: 'Number 2; ob caug = 20 (PDF p.70).', exampleHmn: 'Ob leeg neeg.', exampleVi: 'Hai người.', exampleEn: 'Two people.' },
    { id: 'w_plaub', hmn: 'plaub', en: 'four (4)', vi: 'bốn (4)', phonetic: 'plao', pos: 'p', note: 'Number 4 (PDF p.70).', exampleHmn: 'Plaub lub khob.', exampleVi: 'Bốn cái cốc.', exampleEn: 'Four cups.' },
    { id: 'w_tsib', hmn: 'tsib', en: 'five (5)', vi: 'năm (5)', phonetic: 'chee', pos: 'p', note: 'Number 5 (PDF p.70).', exampleHmn: 'Tsib feeb.', exampleVi: 'Năm phút.', exampleEn: 'Five minutes.' },
    { id: 'w_kaum', hmn: 'kaum', en: 'ten (10)', vi: 'mười (10)', phonetic: 'kao', pos: 'p', note: 'Number 10 (PDF p.70).', exampleHmn: 'Kaum lo lus.', exampleVi: 'Mười từ vựng.', exampleEn: 'Ten words.' },
    { id: 'w_ib_puas', hmn: 'ib puas', en: 'one hundred (100)', vi: 'một trăm (100)', phonetic: 'ee poua', pos: 'p', note: '100; ib txhiab = 1,000 (PDF p.71).', exampleHmn: 'Ib puas txhiab dong.', exampleVi: 'Một trăm nghìn đồng.', exampleEn: 'One hundred thousand VND.' }
  ];

  /**
   * 4. TOURISM & DAILY COMMUNICATION PHRASES FOR "COMMONLY USED PHRASES" PAGE
   * Curated from Learn-Hmong-the-Jay-Way (1).pdf for Hmong locals & tourists in Tả Van / Sapa
   */
  const COMMON_PHRASES = [
    // Category 1: Greetings & Making Friends (greeting)
    {
      id: 'p_greet_1',
      category: 'greeting',
      hmn: 'Nyob zoo! Zoo siab txais tos koj tuaj rau Tả Van.',
      vi: 'Xin chào! Chào mừng bạn đến với bản Tả Van.',
      en: 'Hello! Welcome to Ta Van village.',
      phonetic: 'nyaw zhong! zhong shia tsai taw kaw toua rao Ta Van',
      pos: 'nth',
      note: 'Warm hospitality greeting for welcoming visitors to the village.'
    },
    {
      id: 'p_greet_2',
      category: 'greeting',
      hmn: 'Koj lub npe hu li cas? Kuv lub npe hu ua Jay.',
      vi: 'Tên của bạn là gì? Tên tôi là Jay.',
      en: 'What is your name? My name is Jay.',
      phonetic: 'kaw loo mpeh hoo lee cha? koo loo mpeh hoo oua Jay',
      pos: 'nth',
      note: 'From PDF p.92: "lub npe" uses classifier "lub" for names.'
    },
    {
      id: 'p_greet_3',
      category: 'greeting',
      hmn: 'Koj tuaj lub teb chaws twg tuaj?',
      vi: 'Bạn từ đất nước / tỉnh thành nào đến?',
      en: 'Which country or place are you visiting from?',
      phonetic: 'kaw toua loo teh chaw tew toua',
      pos: 'nth',
      note: '"lub teb chaws" = country / land / region (PDF p.92).'
    },
    {
      id: 'p_greet_4',
      category: 'greeting',
      hmn: 'Kuv paub hais lus Hmoob me me xwb, thov maj mam hais.',
      vi: 'Tôi chỉ biết nói tiếng Hmong một chút thôi, xin hãy nói chậm rãi.',
      en: 'I only speak a little Hmong, please speak slowly.',
      phonetic: 'koo pao hai loo Hmoob meh meh sew, thaw ma ma hai',
      pos: 'nth',
      note: '"me me xwb" = only a little bit; "maj mam" = slowly/gently (PDF p.152).'
    },

    // Category 2: Directions & Trekking (directions)
    {
      id: 'p_dir_1',
      category: 'directions',
      hmn: 'Thov zam txim, txoj kev mus rau lub homestay nyob qhov twg?',
      vi: 'Xin lỗi, đường đi đến homestay ở hướng nào vậy?',
      en: 'Excuse me, where is the road to the homestay?',
      phonetic: 'thaw za tsee, tsaw keh moo rao loo homestay nyaw khaw tew',
      pos: 'nth',
      note: '"txoj kev" uses classifier "txoj" for roads/paths (PDF p.68, 111).'
    },
    {
      id: 'p_dir_2',
      category: 'directions',
      hmn: 'Ncaj qha tov ces lem rau koj sab xis.',
      vi: 'Đi thẳng đằng kia rồi rẽ sang bên phải của bạn.',
      en: 'Go straight ahead over there, then turn to your right.',
      phonetic: 'ncha kha taw cheh leh rao kaw sha see',
      pos: 'nth',
      note: 'Exact directional pattern from PDF p.111 ("sab xis" = right side, "sab laug" = left side).'
    },
    {
      id: 'p_dir_3',
      category: 'directions',
      hmn: 'Ntawm no mus txog lub zos puas deb? Ze ze xwb ohs!',
      vi: 'Từ đây đi tới bản có xa không? Rất gần thôi nhé!',
      en: 'Is it far from here to the village? It is very close!',
      phonetic: 'ndaw naw moo tsaw loo zaw poua deh? zeh zeh sew aw!',
      pos: 'nth',
      note: 'From PDF p.111 dialogue on asking walking distances.'
    },
    {
      id: 'p_dir_4',
      category: 'directions',
      hmn: 'Koj puas xav kom kuv coj kev mus saib cov liaj?',
      vi: 'Bạn có muốn tôi dẫn đường đi ngắm ruộng bậc thang không?',
      en: 'Would you like me to guide you to see the terraced rice fields?',
      phonetic: 'kaw poua sa kaw koo chaw keh moo sai chaw lia',
      pos: 'nth',
      note: '"coj kev" = lead the way / guide trekking.'
    },

    // Category 3: Shopping & Handicrafts (shopping)
    {
      id: 'p_shop_1',
      category: 'shopping',
      hmn: 'Daim paj ntaub no tus nqi yog pes tsawg?',
      vi: 'Tấm thổ cẩm thêu tay này giá bao nhiêu tiền?',
      en: 'How much does this embroidered hemp textile cost?',
      phonetic: 'dai pa ndao naw too nkee yaw peh tser',
      pos: 'nth',
      note: 'From PDF p.179 shopping dialogue: "pes tsawg" = how much/many.'
    },
    {
      id: 'p_shop_2',
      category: 'shopping',
      hmn: 'Daim no peb xaws los ntawm tes, zoo nkauj thiab ruaj heev.',
      vi: 'Tấm này chúng tôi khâu hoàn toàn bằng tay, rất đẹp và bền.',
      en: 'We sewed this piece entirely by hand; it is very beautiful and durable.',
      phonetic: 'dai naw peh saw law ndaw teh, zhong ngao thia roua heh',
      pos: 'nth',
      note: 'Helpful phrase for Hmong artisans explaining handmade crafts to tourists.'
    },
    {
      id: 'p_shop_3',
      category: 'shopping',
      hmn: 'Kim me ntsis lawm, koj txo nqi me ntsis puas tau?',
      vi: 'Hơi đắt một chút rồi, bạn bớt giá một chút có được không?',
      en: 'It is a little bit expensive, can you give a small discount?',
      phonetic: 'kee meh nchee law, kaw tsaw nkee meh nchee poua tao',
      pos: 'nth',
      note: 'Polite bargaining expression using "puas tau" (can/is it possible) (PDF p.179).'
    },
    {
      id: 'p_shop_4',
      category: 'shopping',
      hmn: 'Kuv yuav ob lub hnab paj ntaub no. Ua tsaug ntau!',
      vi: 'Tôi mua hai chiếc túi thổ cẩm này. Cảm ơn rất nhiều!',
      en: 'I will buy these two embroidered bags. Thank you very much!',
      phonetic: 'koo youa aw loo hna pa ndao naw. oua chao ndao!',
      pos: 'nth',
      note: '"lub hnab" = bag/pouch.'
    },

    // Category 4: Homestay & Hospitality (homestay)
    {
      id: 'p_home_1',
      category: 'homestay',
      hmn: 'Hmo no koj puas muaj chav pw seem rau ob leeg neeg?',
      vi: 'Tối nay homestay của bạn còn phòng trống cho hai người không?',
      en: 'Do you have an available room tonight for two guests?',
      phonetic: 'hmaw naw kaw poua moua cha pew sheng rao aw leng neng',
      pos: 'nth',
      note: '"chav pw" = bedroom; "ob leeg neeg" = two people (PDF p.81).'
    },
    {
      id: 'p_home_2',
      category: 'homestay',
      hmn: 'Saum roob hmo ntuj no heev, thov muab ib daim pam ntxiv.',
      vi: 'Trên núi ban đêm lạnh lắm, cho tôi xin thêm một chiếc chăn.',
      en: 'It is very cold on the mountain at night, please give me an extra blanket.',
      phonetic: 'sao rong hmaw ndoo naw heh, thaw moua ee dai pa ntsee',
      pos: 'nth',
      note: '"daim pam" = blanket (uses flat classifier "daim", PDF p.67, 81).'
    },
    {
      id: 'p_home_3',
      category: 'homestay',
      hmn: 'Chav dej thiab dej kub da nyob sab tod.',
      vi: 'Phòng tắm và nước nóng để tắm ở phía bên kia.',
      en: 'The bathroom and hot shower water are right over there.',
      phonetic: 'cha day thia day koo da nyaw sha taw',
      pos: 'nth',
      note: '"da dej" = bathe/shower; "dej kub" = hot water.'
    },

    // Category 5: Food & Local Cuisine (food)
    {
      id: 'p_food_1',
      category: 'food',
      hmn: 'Los noj mov nplaum, nqaij qaib thiab zaub roob nrog peb!',
      vi: 'Mời vào ăn xôi, thịt gà bản và rau rừng cùng gia đình chúng tôi!',
      en: 'Come eat sticky rice, local chicken, and mountain greens with our family!',
      phonetic: 'law naw maw nplao, ngai kai thia zao rong nraw peh',
      pos: 'nth',
      note: 'Classic Hmong family meal invitation (PDF p.85).'
    },
    {
      id: 'p_food_2',
      category: 'food',
      hmn: 'Zaub mov no qab heev! Kuv tsis noj ntsim, thov txhobab kua txob.',
      vi: 'Món ăn này ngon lắm! Tôi không ăn cay, xin đừng bỏ ớt nhé.',
      en: 'This dish is delicious! I do not eat spicy food, please no chili pepper.',
      phonetic: 'zao maw naw kah heh! koo chee naw nchee, thaw txhaw sa koua tsaw',
      pos: 'nth',
      note: '"ntsim" = spicy; "kua txob" = chili pepper (PDF p.85).'
    },
    {
      id: 'p_food_3',
      category: 'food',
      hmn: 'Thov muab ib khob dej kub thiab tshuaj yej roob.',
      vi: 'Cho tôi xin một cốc nước ấm và trà thảo mộc vùng cao.',
      en: 'Please bring me a cup of hot water and mountain herbal tea.',
      phonetic: 'thaw moua ee khaw day koo thia choua yeh rong',
      pos: 'nth',
      note: '"ib khob" = one cup/glass (PDF p.68).'
    },

    // Category 6: Health & Emergency (emergency)
    {
      id: 'p_emg_1',
      category: 'emergency',
      hmn: 'Thov los pab peb! Kuv tus phooj ywg mob ko taw taug kev tsis tau.',
      vi: 'Xin đến giúp chúng tôi với! Bạn tôi bị đau chân không đi bộ được.',
      en: 'Please come help us! My friend hurt their foot and cannot walk.',
      phonetic: 'thaw law pah peh! koo too phong yew maw kaw taw tao keh chee tao',
      pos: 'nth',
      note: 'From PDF p.108, 113 medical & body parts section ("ko taw" = foot).'
    },
    {
      id: 'p_emg_2',
      category: 'emergency',
      hmn: 'Kuv mob taub hau thiab mob plab, puas muaj tshuaj los sis kws kho mob?',
      vi: 'Tôi bị đau đầu và đau bụng, ở đây có thuốc hay bác sĩ không?',
      en: 'I have a headache and stomachache; is there medicine or a doctor nearby?',
      phonetic: 'koo maw tao hao thia maw plah, poua moua choua law shee kew khaw maw',
      pos: 'nth',
      note: 'From PDF p.113: "mob taub hau" (headache), "mob plab" (stomachache), "kws kho mob" (doctor).'
    },

    // Category 7: Culture & Village Life (culture)
    {
      id: 'p_cul_1',
      category: 'culture',
      hmn: 'Lo lus pab peb sib to taub thiab sib hlub.',
      vi: 'Ngôn từ giúp chúng ta thấu hiểu và yêu thương nhau.',
      en: 'Words help us understand and care for one another.',
      phonetic: 'law loo pah peh shee taw tao thia shee hloo',
      pos: 'nth',
      note: 'Core philosophy of Trilinguo / NYOB ZOO from Tả Van.'
    },
    {
      id: 'p_cul_2',
      category: 'culture',
      hmn: 'Kuv puas kam thaij ib daim duab nrog koj?',
      vi: 'Tôi có thể chụp chung với bạn một bức ảnh được không?',
      en: 'May I take a photo together with you?',
      phonetic: 'koo poua ka thai ee dai doua nraw kaw',
      pos: 'nth',
      note: 'Respectful way for tourists to ask permission before taking photos.'
    }
  ];

  /**
   * 5. HELPER: Normalize text for case-insensitive & punctuation-tolerant lookup
   */
  function normalizeText(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[.,?!;:"""''()[\]]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 6. DETECT HMONG RPA TONE FROM A WORD
   */
  function analyzeHmongTone(word) {
    const clean = (word || '').trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return HMONG_TONES.none;
    const lastChar = clean.slice(-1);
    if (HMONG_TONES[lastChar]) {
      return HMONG_TONES[lastChar];
    }
    return HMONG_TONES.none;
  }

  /**
   * 7. GENERATE APPROXIMATE HMONG PHONETIC GUIDE FOR ANY HMONG TEXT
   */
  function generateHmongPhonetics(hmnText) {
    const exact = [...DICTIONARY, ...COMMON_PHRASES].find(
      item => normalizeText(item.hmn) === normalizeText(hmnText)
    );
    if (exact && exact.phonetic) return exact.phonetic;

    const words = (hmnText || '').split(/\s+/).filter(Boolean);
    return words
      .map(w => {
        const clean = normalizeText(w);
        const found = DICTIONARY.find(d => normalizeText(d.hmn) === clean);
        if (found) return found.phonetic;
        return clean
          .replace(/txh/g, 'ts')
          .replace(/ntsh/g, 'nch')
          .replace(/npl/g, 'mbl')
          .replace(/ny/g, 'ny')
          .replace(/ts/g, 'ch')
          .replace(/xy/g, 'sh')
          .replace(/aw/g, 'er')
          .replace(/ee/g, 'eng')
          .replace(/oo/g, 'ong')
          .replace(/ua/g, 'oua')
          .replace(/w/g, 'ew')
          .replace(/[bjvsgmd]$/g, '');
      })
      .join(' ');
  }

  /**
   * 8. LOOKUP ANY SELECTED WORD, PHRASE, OR SENTENCE (3-WAY)
   * Used by Interactive Text Selection Popover & Translator
   */
  function lookupSelection(rawText, preferredSourceLang, preferredTargetLang) {
    const text = (rawText || '').trim();
    const norm = normalizeText(text);
    if (!norm) return null;

    const allEntries = [...DICTIONARY, ...COMMON_PHRASES];

    // 1) Exact match on Hmong, Vietnamese, or English
    let match = allEntries.find(
      item =>
        normalizeText(item.hmn) === norm ||
        normalizeText(item.vi) === norm ||
        normalizeText(item.en) === norm
    );

    // 2) Substring / contains match if not found
    if (!match) {
      match = allEntries.find(
        item =>
          normalizeText(item.hmn).includes(norm) ||
          normalizeText(item.vi).includes(norm) ||
          normalizeText(item.en).includes(norm)
      );
    }

    if (match) {
      const posObj = POS_LABELS[match.pos] || POS_LABELS.nth;
      const toneObj = analyzeHmongTone(match.hmn.split(/\s+/)[0]);
      return {
        original: text,
        hmn: match.hmn,
        vi: match.vi,
        en: match.en,
        phonetic: match.phonetic || generateHmongPhonetics(match.hmn),
        posCode: posObj.code,
        posLabel: posObj,
        tone: toneObj,
        note: match.note || '',
        exampleHmn: match.exampleHmn || match.hmn,
        exampleVi: match.exampleVi || match.vi,
        exampleEn: match.exampleEn || match.en
      };
    }

    // 3) Multi-word decomposition fallback (translate token by token)
    const srcLang = preferredSourceLang || 'hmn';
    const tgtLang = preferredTargetLang || 'vi';
    const translated = translateText(text, srcLang, tgtLang);
    return {
      original: text,
      hmn: srcLang === 'hmn' ? text : translateText(text, srcLang, 'hmn').translatedText,
      vi: srcLang === 'vi' ? text : translateText(text, srcLang, 'vi').translatedText,
      en: srcLang === 'en' ? text : translateText(text, srcLang, 'en').translatedText,
      phonetic: translated.phonetic,
      posCode: '(nth) nthe',
      posLabel: POS_LABELS.nth,
      tone: analyzeHmongTone(text),
      note: translated.grammarNote,
      exampleHmn: translated.hmnText,
      exampleVi: translated.viText,
      exampleEn: translated.enText
    };
  }

  /**
   * 9. 3-WAY TRANSLATION ENGINE (en <-> vi <-> hmn)
   */
  function translateText(inputText, sourceLang, targetLang) {
    const raw = (inputText || '').trim();
    if (!raw) {
      return {
        sourceText: '',
        translatedText: '',
        phonetic: '',
        grammarNote: '',
        breakdown: []
      };
    }

    const norm = normalizeText(raw);
    const allEntries = [...DICTIONARY, ...COMMON_PHRASES];

    // If source and target language are identical
    if (sourceLang === targetLang) {
      return {
        sourceText: raw,
        translatedText: raw,
        hmnText: raw,
        viText: raw,
        enText: raw,
        phonetic: sourceLang === 'hmn' ? generateHmongPhonetics(raw) : '',
        grammarNote: 'Source and target languages are identical.',
        breakdown: []
      };
    }

    // 1. Check exact match in DICTIONARY + COMMON_PHRASES
    const exact = allEntries.find(item => {
      if (sourceLang === 'hmn') return normalizeText(item.hmn) === norm;
      if (sourceLang === 'vi') return normalizeText(item.vi) === norm || normalizeText(item.vi).split('/').some(p => p.trim() === norm);
      if (sourceLang === 'en') return normalizeText(item.en) === norm || normalizeText(item.en).split('/').some(p => p.trim() === norm);
      return false;
    });

    if (exact) {
      const outText = exact[targetLang] || exact.en;
      return {
        sourceText: raw,
        translatedText: outText,
        hmnText: exact.hmn,
        viText: exact.vi,
        enText: exact.en,
        phonetic: exact.phonetic || generateHmongPhonetics(exact.hmn),
        grammarNote: exact.note || 'Matched in Learn-Hmong-the-Jay-Way (1).pdf corpus.',
        pos: POS_LABELS[exact.pos] || POS_LABELS.nth
      };
    }

    // 2. Check across any language if user typed a phrase in another language
    const anyLangMatch = allEntries.find(
      item =>
        normalizeText(item.hmn) === norm ||
        normalizeText(item.vi) === norm ||
        normalizeText(item.en) === norm
    );
    if (anyLangMatch) {
      return {
        sourceText: raw,
        translatedText: anyLangMatch[targetLang],
        hmnText: anyLangMatch.hmn,
        viText: anyLangMatch.vi,
        enText: anyLangMatch.en,
        phonetic: anyLangMatch.phonetic || generateHmongPhonetics(anyLangMatch.hmn),
        grammarNote: anyLangMatch.note || 'Auto-detected phrase from Hmong-Viet-English corpus.',
        pos: POS_LABELS[anyLangMatch.pos] || POS_LABELS.nth
      };
    }

    // 3. Phrase & Word-by-Word Grammatical Translation
    let working = norm;
    const sortedEntries = [...allEntries].sort(
      (a, b) => (b[sourceLang] || '').length - (a[sourceLang] || '').length
    );

    const matchedTokens = [];
    const words = raw.split(/\s+/);
    const outWords = [];
    const hmnWords = [];
    const viWords = [];
    const enWords = [];

    let i = 0;
    while (i < words.length) {
      let matchedLen = 0;
      let matchedEntry = null;

      // Try 4-word, 3-word, 2-word, 1-word window
      for (let len = Math.min(4, words.length - i); len >= 1; len--) {
        const chunk = normalizeText(words.slice(i, i + len).join(' '));
        const found = sortedEntries.find(e => {
          const val = normalizeText(e[sourceLang] || '');
          const parts = val.split('/').map(s => s.trim());
          return val === chunk || parts.includes(chunk);
        });
        if (found) {
          matchedLen = len;
          matchedEntry = found;
          break;
        }
      }

      if (matchedEntry) {
        const cleanTarget = (matchedEntry[targetLang] || '').split('/')[0].trim();
        outWords.push(cleanTarget);
        hmnWords.push(matchedEntry.hmn.split('/')[0].trim());
        viWords.push(matchedEntry.vi.split('/')[0].trim());
        enWords.push(matchedEntry.en.split('/')[0].trim());
        matchedTokens.push(matchedEntry);
        i += matchedLen;
      } else {
        outWords.push(words[i]);
        hmnWords.push(words[i]);
        viWords.push(words[i]);
        enWords.push(words[i]);
        i += 1;
      }
    }

    const finalOut = outWords.join(' ');
    const finalHmn = sourceLang === 'hmn' ? raw : hmnWords.join(' ');
    const finalVi = sourceLang === 'vi' ? raw : viWords.join(' ');
    const finalEn = sourceLang === 'en' ? raw : enWords.join(' ');

    return {
      sourceText: raw,
      translatedText: finalOut.charAt(0).toUpperCase() + finalOut.slice(1),
      hmnText: finalHmn,
      viText: finalVi,
      enText: finalEn,
      phonetic: generateHmongPhonetics(finalHmn),
      grammarNote:
        matchedTokens.length > 0
          ? matchedTokens.map(t => `${t.hmn} (${t.phonetic}): ${t.en} / ${t.vi}`).join(' · ')
          : 'Hmong follows Subject-Verb-Object (SVO) word order like English and Vietnamese (PDF p.96).',
      pos: POS_LABELS.nth
    };
  }

  // Export globally
  global.TrilinguoData = {
    HMONG_TONES,
    POS_LABELS,
    DICTIONARY,
    COMMON_PHRASES,
    normalizeText,
    analyzeHmongTone,
    generateHmongPhonetics,
    lookupSelection,
    translateText
  };
})(window);
