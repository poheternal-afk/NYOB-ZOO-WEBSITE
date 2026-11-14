"""
============================================================================
TRILINGUO / NYOB ZOO — 3-WAY TRANSLATION & HMONG LINGUISTIC ENGINE
(services/translator.py)
Built from Learn-Hmong-the-Jay-Way (1).pdf (Jay Xiong)
Supports English (en) <-> Vietnamese/Kinh (vi) <-> Hmong (hmn)
============================================================================
"""

import csv
import io
import json
import re
from typing import Dict, Any, List, Optional

POS_LABELS: Dict[str, Dict[str, str]] = {
    "u": {"code": "(u) ua", "en": "Verb · (u) ua", "vi": "Động từ · (u) ua", "hmn": "Lo lus ua (u)"},
    "y": {"code": "(y) yam", "en": "Noun · (y) yam", "vi": "Danh từ · (y) yam", "hmn": "Lo lus yam (y)"},
    "p": {"code": "(p) piav yam", "en": "Adjective · (p) piav yam", "vi": "Tính từ · (p) piav yam", "hmn": "Piav yam (p)"},
    "pu": {"code": "(pu) piav ua", "en": "Adverb · (pu) piav ua", "vi": "Trạng từ · (pu) piav ua", "hmn": "Piav ua (pu)"},
    "t": {"code": "(t) tswv", "en": "Pronoun · (t) tswv", "vi": "Đại từ · (t) tswv", "hmn": "Lo lus tswv (t)"},
    "h": {"code": "(h) hom", "en": "Classifier · (h) hom", "vi": "Loại từ · (h) hom", "hmn": "Lo lus hom (h)"},
    "r": {"code": "(r) rau", "en": "Preposition · (r) rau", "vi": "Giới từ · (r) rau", "hmn": "Lo lus rau (r)"},
    "tx": {"code": "(tx) txuas", "en": "Conjunction · (tx) txuas", "vi": "Liên từ · (tx) txuas", "hmn": "Lo lus txuas (tx)"},
    "nth": {"code": "(nth) nthe", "en": "Expression · (nth) nthe", "vi": "Cụm giao tiếp · (nth)", "hmn": "Kab lus sib fim (nth)"},
}

DICTIONARY: List[Dict[str, str]] = [
    {"id": "w_nyob_zoo", "hmn": "Nyob zoo", "en": "Hello / Good day", "vi": "Xin chào / Chào bạn", "phonetic": "nyaw zhong", "pos": "nth", "note": "Literally 'stay good/well'. Universal Hmong greeting (PDF p.92).", "exampleHmn": "Nyob zoo! Koj nyob li cas?", "exampleVi": "Xin chào! Bạn khỏe không?", "exampleEn": "Hello! How are you?"},
    {"id": "w_ua_tsaug", "hmn": "Ua tsaug", "en": "Thank you", "vi": "Cảm ơn", "phonetic": "oua chao", "pos": "nth", "note": "Add 'ntau' (Ua tsaug ntau) for 'Thank you very much' (PDF p.55, 92).", "exampleHmn": "Ua tsaug ntau rau koj kev pab.", "exampleVi": "Cảm ơn nhiều vì sự giúp đỡ của bạn.", "exampleEn": "Thank you very much for your help."},
    {"id": "w_ua_tsaug_ntau", "hmn": "Ua tsaug ntau", "en": "Thank you very much", "vi": "Cảm ơn rất nhiều", "phonetic": "oua chao ndao", "pos": "nth", "note": "'ntau' means many/much (PDF p.93).", "exampleHmn": "Ua tsaug ntau nawb!", "exampleVi": "Cảm ơn rất nhiều nhé!", "exampleEn": "Thank you very much!"},
    {"id": "w_tsis_ua_li_cas", "hmn": "Tsis ua li cas", "en": "You're welcome / No problem", "vi": "Không có gì / Đừng ngại", "phonetic": "chee oua lee cha", "pos": "nth", "note": "Literally 'does not do anything/matter' (PDF p.94).", "exampleHmn": "Tsis ua li cas, peb yog phooj ywg.", "exampleVi": "Không có gì, chúng ta là bạn bè mà.", "exampleEn": "You're welcome, we are friends."},
    {"id": "w_koj_nyob_li_cas", "hmn": "Koj nyob li cas?", "en": "How are you?", "vi": "Bạn khỏe không? / Bạn thế nào?", "phonetic": "kaw nyaw lee cha", "pos": "nth", "note": "'Koj' (you) + 'nyob' (stay/live) + 'li cas' (how) (PDF p.93).", "exampleHmn": "Hnub no koj nyob li cas?", "exampleVi": "Hôm nay bạn thế nào?", "exampleEn": "How are you doing today?"},
    {"id": "w_kuv_nyob_zoo", "hmn": "Kuv nyob zoo", "en": "I am fine / I am doing well", "vi": "Tôi khỏe / Tôi vẫn tốt", "phonetic": "koo nyaw zhong", "pos": "nth", "note": "Standard response to 'Koj nyob li cas?' (PDF p.93).", "exampleHmn": "Kuv nyob zoo, ua tsaug.", "exampleVi": "Tôi khỏe, cảm ơn bạn.", "exampleEn": "I am fine, thank you."},
    {"id": "w_mus_zoo", "hmn": "Mus zoo", "en": "Goodbye / Safe travels", "vi": "Tạm biệt / Đi thượng lộ bình an", "phonetic": "moo zhong", "pos": "nth", "note": "Said to the person leaving: 'Go well' (Mus zoo koj) (PDF p.93).", "exampleHmn": "Mus zoo koj nawb, sis ntsib dua!", "exampleVi": "Bạn đi bình an nhé, hẹn gặp lại!", "exampleEn": "Safe travels, see you again!"},
    {"id": "w_sis_ntsib_dua", "hmn": "Sis ntsib dua", "en": "See you again", "vi": "Hẹn gặp lại", "phonetic": "shee jee doua", "pos": "nth", "note": "Also spelled 'Sib ntsib dua' (PDF p.94, 152).", "exampleHmn": "Tag kis peb sis ntsib dua.", "exampleVi": "Ngày mai chúng ta gặp lại nhé.", "exampleEn": "See you again tomorrow."},
    {"id": "w_thov_zam_txim", "hmn": "Thov zam txim", "en": "Excuse me / I apologize", "vi": "Xin lỗi / Xin thứ lỗi", "phonetic": "thaw za tsee", "pos": "nth", "note": "Polite phrase for asking pardon or getting attention (PDF p.111).", "exampleHmn": "Thov zam txim, chav dej nyob qhov twg?", "exampleVi": "Xin lỗi, nhà vệ sinh ở đâu vậy?", "exampleEn": "Excuse me, where is the restroom?"},
    {"id": "w_zoo_siab_ntsib_koj", "hmn": "Zoo siab tau ntsib koj", "en": "Nice to meet you", "vi": "Rất vui được gặp bạn", "phonetic": "zhong shia tao jee kaw", "pos": "nth", "note": "'Zoo siab' (happy) + 'tau ntsib' (got to meet) + 'koj' (you) (PDF p.93).", "exampleHmn": "Kuv zoo siab tau ntsib koj nyob Tả Van.", "exampleVi": "Tôi rất vui được gặp bạn ở Tả Van.", "exampleEn": "I am happy to meet you in Ta Van."},
    {"id": "w_kuv", "hmn": "kuv", "en": "I / me / my", "vi": "tôi / của tôi", "phonetic": "koo", "pos": "t", "note": "First-person singular pronoun (PDF p.63).", "exampleHmn": "Kuv yog neeg Hmoob.", "exampleVi": "Tôi là người Hmong.", "exampleEn": "I am Hmong."},
    {"id": "w_koj", "hmn": "koj", "en": "you / your", "vi": "bạn / của bạn", "phonetic": "kaw", "pos": "t", "note": "Second-person singular pronoun (PDF p.63).", "exampleHmn": "Koj lub npe hu li cas?", "exampleVi": "Tên của bạn là gì?", "exampleEn": "What is your name?"},
    {"id": "w_peb", "hmn": "peb", "en": "we / us / our", "vi": "chúng tôi / chúng ta", "phonetic": "peh", "pos": "t", "note": "First-person plural (3+ people); also number 3 (PDF p.63).", "exampleHmn": "Peb sib to taub.", "exampleVi": "Chúng ta hiểu nhau.", "exampleEn": "We understand each other."},
    {"id": "w_wb", "hmn": "wb", "en": "we two / both of us", "vi": "hai chúng ta", "phonetic": "ew", "pos": "t", "note": "Dual pronoun for 2 people (PDF p.63).", "exampleHmn": "Wb mus ua ke.", "exampleVi": "Hai chúng ta đi cùng nhau.", "exampleEn": "The two of us go together."},
    {"id": "w_nws", "hmn": "nws", "en": "he / she / it", "vi": "anh ấy / cô ấy / nó", "phonetic": "new", "pos": "t", "note": "Third-person singular pronoun (PDF p.63).", "exampleHmn": "Nws hais lus Hmoob.", "exampleVi": "Anh/cô ấy nói tiếng Hmong.", "exampleEn": "He/she speaks Hmong."},
    {"id": "w_lawv", "hmn": "lawv", "en": "they / them / their", "vi": "họ / của họ", "phonetic": "ler", "pos": "t", "note": "Third-person plural (PDF p.63).", "exampleHmn": "Lawv nyob hauv lub zos.", "exampleVi": "Họ sống trong bản.", "exampleEn": "They live in the village."},
    {"id": "w_lub", "hmn": "lub", "en": "classifier (round/bulky objects, places)", "vi": "cái / quả / ngôi (loại từ)", "phonetic": "loo", "pos": "h", "note": "Most common Hmong classifier (PDF p.67).", "exampleHmn": "Lub tsev no zoo nkauj heev.", "exampleVi": "Ngôi nhà này rất đẹp.", "exampleEn": "This house is very beautiful."},
    {"id": "w_tus", "hmn": "tus", "en": "classifier (people, animals, long objects)", "vi": "người / con / cây (loại từ)", "phonetic": "too", "pos": "h", "note": "Classifier for living beings & rivers/roads (PDF p.67).", "exampleHmn": "Tus dev thiab tus nyuj.", "exampleVi": "Con chó và con trâu/bò.", "exampleEn": "The dog and the buffalo."},
    {"id": "w_daim", "hmn": "daim", "en": "classifier (flat objects, clothes, fields)", "vi": "tấm / mảnh / chiếc (loại từ)", "phonetic": "dai", "pos": "h", "note": "Used for flat surfaces like textiles & paddy fields (PDF p.67).", "exampleHmn": "Daim tiab Hmoob paj ntaub.", "exampleVi": "Chiếc váy thổ cẩm Hmong.", "exampleEn": "Hmong embroidered skirt."},
    {"id": "w_hais", "hmn": "hais", "en": "speak / say", "vi": "nói", "phonetic": "hai", "pos": "u", "note": "Often paired as 'hais lus' (PDF p.58).", "exampleHmn": "Maj mam hais lus.", "exampleVi": "Xin hãy nói chậm rãi.", "exampleEn": "Please speak slowly."},
    {"id": "w_txhais", "hmn": "txhais", "en": "translate / meaning", "vi": "dịch / giải nghĩa", "phonetic": "tsai", "pos": "u", "note": "Txhais lus = translate language.", "exampleHmn": "Txhais tam sim no.", "exampleVi": "Dịch ngay bây giờ.", "exampleEn": "Translate right now."},
    {"id": "w_kawm", "hmn": "kawm", "en": "learn / study", "vi": "học / học tập", "phonetic": "ker", "pos": "u", "note": "Kawm lus Hmoob = learn Hmong (PDF p.58).", "exampleHmn": "Kuv xav kawm lus Hmoob.", "exampleVi": "Tôi muốn học tiếng Hmong.", "exampleEn": "I want to learn Hmong."},
    {"id": "w_to_taub", "hmn": "to taub", "en": "understand / comprehend", "vi": "hiểu / thấu hiểu", "phonetic": "taw tao", "pos": "u", "note": "Peb sib to taub = we understand each other.", "exampleHmn": "Koj puas to taub kuv hais?", "exampleVi": "Bạn có hiểu tôi nói không?", "exampleEn": "Do you understand what I say?"},
    {"id": "w_pab", "hmn": "pab", "en": "help / assist", "vi": "giúp đỡ", "phonetic": "pah", "pos": "u", "note": "Lo lus pab peb sib to taub (PDF p.60).", "exampleHmn": "Thov koj pab kuv.", "exampleVi": "Xin bạn hãy giúp tôi.", "exampleEn": "Please help me."},
    {"id": "w_noj", "hmn": "noj", "en": "eat", "vi": "ăn", "phonetic": "naw", "pos": "u", "note": "Noj mov = eat rice/meal (PDF p.60).", "exampleHmn": "Koj puas tau noj mov?", "exampleVi": "Bạn đã ăn cơm chưa?", "exampleEn": "Have you eaten yet?"},
    {"id": "w_haus", "hmn": "haus", "en": "drink", "vi": "uống", "phonetic": "hao", "pos": "u", "note": "Haus dej = drink water (PDF p.58).", "exampleHmn": "Thov muab ib khob dej kub haus.", "exampleVi": "Cho tôi xin một cốc nước nóng để uống.", "exampleEn": "Please give me a cup of hot water."},
    {"id": "w_mov", "hmn": "mov", "en": "cooked rice / meal", "vi": "cơm / bữa ăn", "phonetic": "maw", "pos": "y", "note": "Mov nplaum = sticky rice (PDF p.85).", "exampleHmn": "Mov nplaum qab heev.", "exampleVi": "Xôi ngon lắm.", "exampleEn": "Sticky rice is very delicious."},
    {"id": "w_dej", "hmn": "dej", "en": "water", "vi": "nước", "phonetic": "day", "pos": "y", "note": "Dej kub = hot water (PDF p.85).", "exampleHmn": "Kuv xav haus dej.", "exampleVi": "Tôi muốn uống nước.", "exampleEn": "I want to drink water."},
    {"id": "w_tsev", "hmn": "tsev", "en": "house / homestay", "vi": "nhà / homestay", "phonetic": "cheh", "pos": "y", "note": "Lub tsev = the house (PDF p.81).", "exampleHmn": "Koj lub tsev nyob qhov twg?", "exampleVi": "Nhà của bạn ở đâu?", "exampleEn": "Where is your house?"},
    {"id": "w_liaj", "hmn": "liaj", "en": "terraced rice paddy field", "vi": "ruộng bậc thang", "phonetic": "lia", "pos": "y", "note": "Daim liaj = rice paddy terrace (PDF p.88).", "exampleHmn": "Cov liaj nyob Tả Van zoo nkauj kawg.", "exampleVi": "Ruộng bậc thang ở Tả Van rất đẹp.", "exampleEn": "The terraced fields in Ta Van are gorgeous."},
    {"id": "w_paj_ntaub", "hmn": "paj ntaub", "en": "embroidered cloth / batik textile", "vi": "thổ cẩm / vải thêu hoa", "phonetic": "pa ndao", "pos": "y", "note": "Traditional Hmong flower cloth.", "exampleHmn": "Daim paj ntaub no ua los ntawm tes.", "exampleVi": "Tấm thổ cẩm này làm bằng tay.", "exampleEn": "This flower cloth is handmade."},
]

COMMON_PHRASES: List[Dict[str, str]] = [
    {"id": "p_greet_1", "category": "greeting", "hmn": "Nyob zoo! Zoo siab txais tos koj tuaj rau Tả Van.", "vi": "Xin chào! Chào mừng bạn đến với bản Tả Van.", "en": "Hello! Welcome to Ta Van village.", "phonetic": "nyaw zhong! zhong shia tsai taw kaw toua rao Ta Van", "pos": "nth", "note": "Warm hospitality greeting for welcoming visitors to the village."},
    {"id": "p_greet_2", "category": "greeting", "hmn": "Koj lub npe hu li cas? Kuv lub npe hu ua Jay.", "vi": "Tên của bạn là gì? Tên tôi là Jay.", "en": "What is your name? My name is Jay.", "phonetic": "kaw loo mpeh hoo lee cha? koo loo mpeh hoo oua Jay", "pos": "nth", "note": "From PDF p.92: 'lub npe' uses classifier 'lub' for names."},
    {"id": "p_greet_3", "category": "greeting", "hmn": "Koj tuaj lub teb chaws twg tuaj?", "vi": "Bạn từ đất nước / tỉnh thành nào đến?", "en": "Which country or place are you visiting from?", "phonetic": "kaw toua loo teh chaw tew toua", "pos": "nth", "note": "'lub teb chaws' = country / region (PDF p.92)."},
    {"id": "p_greet_4", "category": "greeting", "hmn": "Kuv paub hais lus Hmoob me me xwb, thov maj mam hais.", "vi": "Tôi chỉ biết nói tiếng Hmong một chút thôi, xin hãy nói chậm rãi.", "en": "I only speak a little Hmong, please speak slowly.", "phonetic": "koo pao hai loo Hmoob meh meh sew, thaw ma ma hai", "pos": "nth", "note": "'me me xwb' = only a little bit; 'maj mam' = slowly (PDF p.152)."},
    {"id": "p_dir_1", "category": "directions", "hmn": "Thov zam txim, txoj kev mus rau lub homestay nyob qhov twg?", "vi": "Xin lỗi, đường đi đến homestay ở hướng nào vậy?", "en": "Excuse me, where is the road to the homestay?", "phonetic": "thaw za tsee, tsaw keh moo rao loo homestay nyaw khaw tew", "pos": "nth", "note": "'txoj kev' uses classifier 'txoj' for roads/paths (PDF p.68, 111)."},
    {"id": "p_dir_2", "category": "directions", "hmn": "Ncaj qha tov ces lem rau koj sab xis.", "vi": "Đi thẳng đằng kia rồi rẽ sang bên phải của bạn.", "en": "Go straight ahead over there, then turn to your right.", "phonetic": "ncha kha taw cheh leh rao kaw sha see", "pos": "nth", "note": "Directional pattern from PDF p.111 ('sab xis' = right, 'sab laug' = left)."},
    {"id": "p_dir_3", "category": "directions", "hmn": "Ntawm no mus txog lub zos puas deb? Ze ze xwb ohs!", "vi": "Từ đây đi tới bản có xa không? Rất gần thôi nhé!", "en": "Is it far from here to the village? It is very close!", "phonetic": "ndaw naw moo tsaw loo zaw poua deh? zeh zeh sew aw!", "pos": "nth", "note": "From PDF p.111 dialogue on walking distances."},
    {"id": "p_dir_4", "category": "directions", "hmn": "Koj puas xav kom kuv coj kev mus saib cov liaj?", "vi": "Bạn có muốn tôi dẫn đường đi ngắm ruộng bậc thang không?", "en": "Would you like me to guide you to see the terraced rice fields?", "phonetic": "kaw poua sa kaw koo chaw keh moo sai chaw lia", "pos": "nth", "note": "'coj kev' = lead the way / guide trekking."},
    {"id": "p_shop_1", "category": "shopping", "hmn": "Daim paj ntaub no tus nqi yog pes tsawg?", "vi": "Tấm thổ cẩm thêu tay này giá bao nhiêu tiền?", "en": "How much does this embroidered hemp textile cost?", "phonetic": "dai pa ndao naw too nkee yaw peh tser", "pos": "nth", "note": "From PDF p.179 shopping dialogue: 'pes tsawg' = how much."},
    {"id": "p_shop_2", "category": "shopping", "hmn": "Daim no peb xaws los ntawm tes, zoo nkauj thiab ruaj heev.", "vi": "Tấm này chúng tôi khâu hoàn toàn bằng tay, rất đẹp và bền.", "en": "We sewed this piece entirely by hand; it is very beautiful and durable.", "phonetic": "dai naw peh saw law ndaw teh, zhong ngao thia roua heh", "pos": "nth", "note": "Helpful phrase for Hmong artisans explaining handmade crafts."},
    {"id": "p_shop_3", "category": "shopping", "hmn": "Kim me ntsis lawm, koj txo nqi me ntsis puas tau?", "vi": "Hơi đắt một chút rồi, bạn bớt giá một chút có được không?", "en": "It is a little bit expensive, can you give a small discount?", "phonetic": "kee meh nchee law, kaw tsaw nkee meh nchee poua tao", "pos": "nth", "note": "Polite bargaining expression using 'puas tau' (PDF p.179)."},
    {"id": "p_shop_4", "category": "shopping", "hmn": "Kuv yuav ob lub hnab paj ntaub no. Ua tsaug ntau!", "vi": "Tôi mua hai chiếc túi thổ cẩm này. Cảm ơn rất nhiều!", "en": "I will buy these two embroidered bags. Thank you very much!", "phonetic": "koo youa aw loo hna pa ndao naw. oua chao ndao!", "pos": "nth", "note": "'lub hnab' = bag/pouch."},
    {"id": "p_home_1", "category": "homestay", "hmn": "Hmo no koj puas muaj chav pw seem rau ob leeg neeg?", "vi": "Tối nay homestay của bạn còn phòng trống cho hai người không?", "en": "Do you have an available room tonight for two guests?", "phonetic": "hmaw naw kaw poua moua cha pew sheng rao aw leng neng", "pos": "nth", "note": "'chav pw' = bedroom; 'ob leeg neeg' = two people (PDF p.81)."},
    {"id": "p_home_2", "category": "homestay", "hmn": "Saum roob hmo ntuj no heev, thov muab ib daim pam ntxiv.", "vi": "Trên núi ban đêm lạnh lắm, cho tôi xin thêm một chiếc chăn.", "en": "It is very cold on the mountain at night, please give me an extra blanket.", "phonetic": "sao rong hmaw ndoo naw heh, thaw moua ee dai pa ntsee", "pos": "nth", "note": "'daim pam' = blanket (uses flat classifier 'daim', PDF p.67, 81)."},
    {"id": "p_home_3", "category": "homestay", "hmn": "Chav dej thiab dej kub da nyob sab tod.", "vi": "Phòng tắm và nước nóng để tắm ở phía bên kia.", "en": "The bathroom and hot shower water are right over there.", "phonetic": "cha day thia day koo da nyaw sha taw", "pos": "nth", "note": "'da dej' = bathe/shower; 'dej kub' = hot water."},
    {"id": "p_food_1", "category": "food", "hmn": "Los noj mov nplaum, nqaij qaib thiab zaub roob nrog peb!", "vi": "Mời vào ăn xôi, thịt gà bản và rau rừng cùng gia đình chúng tôi!", "en": "Come eat sticky rice, local chicken, and mountain greens with our family!", "phonetic": "law naw maw nplao, ngai kai thia zao rong nraw peh", "pos": "nth", "note": "Classic Hmong family meal invitation (PDF p.85)."},
    {"id": "p_food_2", "category": "food", "hmn": "Zaub mov no qab heev! Kuv tsis noj ntsim, thov txhob sa kua txob.", "vi": "Món ăn này ngon lắm! Tôi không ăn cay, xin đừng bỏ ớt nhé.", "en": "This dish is delicious! I do not eat spicy food, please no chili pepper.", "phonetic": "zao maw naw kah heh! koo chee naw nchee, thaw txhaw sa koua tsaw", "pos": "nth", "note": "'ntsim' = spicy; 'kua txob' = chili pepper (PDF p.85)."},
    {"id": "p_food_3", "category": "food", "hmn": "Thov muab ib khob dej kub thiab tshuaj yej roob.", "vi": "Cho tôi xin một cốc nước ấm và trà thảo mộc vùng cao.", "en": "Please bring me a cup of hot water and mountain herbal tea.", "phonetic": "thaw moua ee khaw day koo thia choua yeh rong", "pos": "nth", "note": "'ib khob' = one cup/glass (PDF p.68)."},
    {"id": "p_emg_1", "category": "emergency", "hmn": "Thov los pab peb! Kuv tus phooj ywg mob ko taw taug kev tsis tau.", "vi": "Xin đến giúp chúng tôi với! Bạn tôi bị đau chân không đi bộ được.", "en": "Please come help us! My friend hurt their foot and cannot walk.", "phonetic": "thaw law pah peh! koo too phong yew maw kaw taw tao keh chee tao", "pos": "nth", "note": "From PDF p.108, 113 medical & body parts section ('ko taw' = foot)."},
    {"id": "p_emg_2", "category": "emergency", "hmn": "Kuv mob taub hau thiab mob plab, puas muaj tshuaj los sis kws kho mob?", "vi": "Tôi bị đau đầu và đau bụng, ở đây có thuốc hay bác sĩ không?", "en": "I have a headache and stomachache; is there medicine or a doctor nearby?", "phonetic": "koo maw tao hao thia maw plah, poua moua choua law shee kew khaw maw", "pos": "nth", "note": "From PDF p.113: 'mob taub hau' (headache), 'mob plab' (stomachache)."},
    {"id": "p_cul_1", "category": "culture", "hmn": "Lo lus pab peb sib to taub thiab sib hlub.", "vi": "Ngôn từ giúp chúng ta thấu hiểu và yêu thương nhau.", "en": "Words help us understand and care for one another.", "phonetic": "law loo pah peh shee taw tao thia shee hloo", "pos": "nth", "note": "Core philosophy of Trilinguo / NYOB ZOO from Tả Van."},
    {"id": "p_cul_2", "category": "culture", "hmn": "Kuv puas kam thaij ib daim duab nrog koj?", "vi": "Tôi có thể chụp chung với bạn một bức ảnh được không?", "en": "May I take a photo together with you?", "phonetic": "koo poua ka thai ee dai doua nraw kaw", "pos": "nth", "note": "Respectful way for tourists to ask permission before taking photos."},
]

# Dynamic Corpus learned from User Contributions + Admin Uploaded Documents
DYNAMIC_CORPUS: List[Dict[str, str]] = []


def normalize_text(text: str) -> str:
    clean = re.sub(r'[.,?!;:"""\'\'()\[\]]+', " ", (text or "").lower())
    return re.sub(r"\s+", " ", clean).strip()


def get_active_corpus() -> List[Dict[str, str]]:
    """
    Combines dynamically learned entries (User Contributions + Admin Uploaded Documents)
    with the core DICTIONARY and COMMON_PHRASES. Dynamic entries take priority.
    """
    return DYNAMIC_CORPUS + DICTIONARY + COMMON_PHRASES


def sync_dynamic_corpus_from_db(db_session) -> List[Dict[str, str]]:
    """
    Loads all learned CorpusEntry rows from the database into DYNAMIC_CORPUS
    so the 3-way translation engine immediately uses all community & admin knowledge.
    """
    global DYNAMIC_CORPUS
    try:
        from models import CorpusEntry

        rows = db_session.query(CorpusEntry).order_by(CorpusEntry.updated_at.desc(), CorpusEntry.id.desc()).all()
        loaded: List[Dict[str, str]] = []
        for r in rows:
            hmn_val = (r.hmn_text or "").strip()
            vi_val = (r.vi_text or "").strip()
            en_val = (r.en_text or "").strip()
            if not hmn_val:
                continue
            loaded.append(
                {
                    "id": f"c_{r.id}",
                    "hmn": hmn_val,
                    "vi": vi_val or en_val or hmn_val,
                    "en": en_val or vi_val or hmn_val,
                    "phonetic": r.phonetic or generate_hmong_phonetics(hmn_val),
                    "pos": "nth",
                    "note": r.note
                    or (
                        f"Đóng góp từ cộng đồng ({r.source_name or 'Học viên'})"
                        if r.source_type == "user_contribution"
                        else f"Trích xuất từ tài liệu Admin ({r.source_name or 'Document'})"
                    ),
                }
            )
        DYNAMIC_CORPUS = loaded
    except Exception:
        pass
    return DYNAMIC_CORPUS


def generate_hmong_phonetics(hmn_text: str) -> str:
    norm = normalize_text(hmn_text)
    for item in DYNAMIC_CORPUS + DICTIONARY + COMMON_PHRASES:
        if normalize_text(item["hmn"]) == norm and item.get("phonetic"):
            return item["phonetic"]

    words = [w for w in (hmn_text or "").split() if w]
    out: List[str] = []
    for w in words:
        cw = normalize_text(w)
        matched = next(
            (d["phonetic"] for d in (DYNAMIC_CORPUS + DICTIONARY) if normalize_text(d["hmn"]) == cw and d.get("phonetic")),
            None,
        )
        if matched:
            out.append(matched)
        else:
            p = cw.replace("txh", "ts").replace("ntsh", "nch").replace("npl", "mbl")
            p = p.replace("ts", "ch").replace("xy", "sh").replace("aw", "er")
            p = p.replace("ee", "eng").replace("oo", "ong").replace("ua", "oua").replace("w", "ew")
            p = re.sub(r"[bjvsgmd]$", "", p)
            out.append(p)
    return " ".join(out)


def translate_text_3way(text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {
            "source_text": "",
            "translated_text": "",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "hmn_text": "",
            "vi_text": "",
            "en_text": "",
            "phonetic": "",
            "pos_code": "(nth) nthe",
            "grammar_note": "",
        }

    norm = normalize_text(raw)
    all_entries = get_active_corpus()

    if source_lang == target_lang:
        return {
            "source_text": raw,
            "translated_text": raw,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "hmn_text": raw,
            "vi_text": raw,
            "en_text": raw,
            "phonetic": generate_hmong_phonetics(raw) if source_lang == "hmn" else "",
            "pos_code": "(nth) nthe",
            "grammar_note": "Ngôn ngữ đầu vào và đầu ra giống nhau.",
        }

    # 1. Exact match in source_lang
    for entry in all_entries:
        val = normalize_text(entry.get(source_lang, ""))
        if not val:
            continue
        parts = [p.strip() for p in val.split("/") if p.strip()]
        if val == norm or norm in parts:
            pos_obj = POS_LABELS.get(entry.get("pos", "nth"), POS_LABELS["nth"])
            out_val = entry.get(target_lang) or entry.get("vi") or entry.get("en") or raw
            return {
                "source_text": raw,
                "translated_text": out_val,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "hmn_text": entry["hmn"],
                "vi_text": entry.get("vi") or out_val,
                "en_text": entry.get("en") or out_val,
                "phonetic": entry.get("phonetic") or generate_hmong_phonetics(entry["hmn"]),
                "pos_code": pos_obj["code"],
                "grammar_note": entry.get("note", ""),
            }

    # 2. Match across any language in corpus
    for entry in all_entries:
        if (
            normalize_text(entry.get("hmn", "")) == norm
            or normalize_text(entry.get("vi", "")) == norm
            or normalize_text(entry.get("en", "")) == norm
        ):
            pos_obj = POS_LABELS.get(entry.get("pos", "nth"), POS_LABELS["nth"])
            out_val = entry.get(target_lang) or entry.get("vi") or entry.get("en") or raw
            return {
                "source_text": raw,
                "translated_text": out_val,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "hmn_text": entry["hmn"],
                "vi_text": entry.get("vi") or out_val,
                "en_text": entry.get("en") or out_val,
                "phonetic": entry.get("phonetic") or generate_hmong_phonetics(entry["hmn"]),
                "pos_code": pos_obj["code"],
                "grammar_note": entry.get("note", ""),
            }

    # 3. Token-by-token phrase decomposition
    words = raw.split()
    out_words: List[str] = []
    hmn_words: List[str] = []
    vi_words: List[str] = []
    en_words: List[str] = []
    notes: List[str] = []

    sorted_entries = sorted(all_entries, key=lambda x: len(x.get(source_lang, "")), reverse=True)
    i = 0
    while i < len(words):
        matched_entry: Optional[Dict[str, str]] = None
        matched_len = 0
        for length in range(min(5, len(words) - i), 0, -1):
            chunk = normalize_text(" ".join(words[i : i + length]))
            for entry in sorted_entries:
                val = normalize_text(entry.get(source_lang, ""))
                if not val:
                    continue
                parts = [p.strip() for p in val.split("/") if p.strip()]
                if val == chunk or chunk in parts:
                    matched_entry = entry
                    matched_len = length
                    break
            if matched_entry:
                break

        if matched_entry:
            t_val = (matched_entry.get(target_lang) or matched_entry.get("vi") or matched_entry.get("en") or "").split("/")[0].strip()
            h_val = (matched_entry.get("hmn") or "").split("/")[0].strip()
            v_val = (matched_entry.get("vi") or t_val).split("/")[0].strip()
            e_val = (matched_entry.get("en") or t_val).split("/")[0].strip()
            out_words.append(t_val)
            hmn_words.append(h_val)
            vi_words.append(v_val)
            en_words.append(e_val)
            phon = matched_entry.get("phonetic") or generate_hmong_phonetics(h_val)
            notes.append(f"{h_val} (/{phon}/): {v_val} / {e_val}")
            i += matched_len
        else:
            out_words.append(words[i])
            hmn_words.append(words[i])
            vi_words.append(words[i])
            en_words.append(words[i])
            i += 1

    final_out = " ".join(out_words)
    if final_out:
        final_out = final_out[0].upper() + final_out[1:]
    final_hmn = raw if source_lang == "hmn" else " ".join(hmn_words)
    final_vi = raw if source_lang == "vi" else " ".join(vi_words)
    final_en = raw if source_lang == "en" else " ".join(en_words)

    return {
        "source_text": raw,
        "translated_text": final_out,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "hmn_text": final_hmn,
        "vi_text": final_vi,
        "en_text": final_en,
        "phonetic": generate_hmong_phonetics(final_hmn),
        "pos_code": "(nth) nthe",
        "grammar_note": " · ".join(notes) if notes else "Cấu trúc câu tiếng Hmong theo trật tự Chủ ngữ - Động từ - Tân ngữ (SVO) tương tự tiếng Việt và tiếng Anh (PDF p.96).",
    }


def parse_document_content_to_entries(filename: str, raw_content: str) -> List[Dict[str, str]]:
    """
    Intelligently parses an uploaded document (.csv, .tsv, .json, .txt, .md)
    into normalized corpus entries: [{'hmn_text', 'vi_text', 'en_text', 'note'}].
    Requires hmn_text and at least 1 of (vi_text, en_text).
    """
    content = (raw_content or "").strip()
    if not content:
        return []

    ext = (filename or "").lower().rsplit(".", 1)[-1] if "." in (filename or "") else "txt"
    extracted: List[Dict[str, str]] = []

    # 1. JSON format
    if ext == "json" or content.startswith("[") or content.startswith("{"):
        try:
            data = json.loads(content)
            items = data if isinstance(data, list) else data.get("entries") or data.get("items") or [data]
            if isinstance(items, list):
                for obj in items:
                    if not isinstance(obj, dict):
                        continue
                    hmn = str(obj.get("hmn_text") or obj.get("hmn") or obj.get("hmong") or "").strip()
                    vi = str(obj.get("vi_text") or obj.get("vi") or obj.get("vietnamese") or obj.get("kinh") or "").strip()
                    en = str(obj.get("en_text") or obj.get("en") or obj.get("english") or "").strip()
                    note = str(obj.get("note") or obj.get("example") or "").strip()
                    if hmn and (vi or en):
                        extracted.append({"hmn_text": hmn, "vi_text": vi, "en_text": en, "note": note})
                if extracted:
                    return extracted
        except Exception:
            pass

    # 2. CSV / TSV format
    if ext in ("csv", "tsv") or ("\t" in content and "\n" in content):
        try:
            delimiter = "\t" if (ext == "tsv" or content.count("\t") > content.count(",")) else ","
            reader = csv.reader(io.StringIO(content), delimiter=delimiter)
            for idx, row in enumerate(reader):
                cols = [c.strip() for c in row if c is not None]
                if len(cols) < 2:
                    continue
                first_low = cols[0].lower()
                if idx == 0 and first_low in ("hmn", "hmong", "hmn_text", "tiếng mông", "tiếng hmong", "tu_vung"):
                    continue
                hmn = cols[0]
                vi = cols[1] if len(cols) > 1 else ""
                en = cols[2] if len(cols) > 2 else ""
                note = cols[3] if len(cols) > 3 else ""
                if hmn and (vi or en):
                    extracted.append({"hmn_text": hmn, "vi_text": vi, "en_text": en, "note": note})
            if extracted:
                return extracted
        except Exception:
            pass

    # 3. Free-form Text / Markdown (.txt, .md) line-by-line parsing
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("//"):
            continue
        # Strip leading bullet or numbering like "1. " or "- "
        line = re.sub(r"^(?:\d+[\.\)]\s*|[-*•]\s*)", "", line).strip()
        if not line:
            continue

        parts: List[str] = []
        for sep in ("|", "\t", ";", " — ", " - ", " = ", " : "):
            if sep in line:
                parts = [p.strip() for p in line.split(sep)]
                break
        if not parts and "," in line:
            parts = [p.strip() for p in line.split(",")]

        if len(parts) >= 2:
            hmn = parts[0]
            vi = parts[1] if len(parts) > 1 else ""
            en = parts[2] if len(parts) > 2 else ""
            note = parts[3] if len(parts) > 3 else ""
            if hmn.lower() in ("hmn", "hmong", "tiếng mông", "tiếng hmong"):
                continue
            if hmn and (vi or en):
                extracted.append({"hmn_text": hmn, "vi_text": vi, "en_text": en, "note": note})

    return extracted

