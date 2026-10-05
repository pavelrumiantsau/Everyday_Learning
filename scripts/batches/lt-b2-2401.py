# Batch source for content/lt/vocab/b2-2401.yaml (B1→B2 topic gaps: kitchen & cooking, household chores, clothes & appearance;
# lemmas from frequency ranks 35000–47000 plus a topic checklist against existing vocabulary).
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT, PLAN "Inputs…" 3).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["kruopos", "grikiai", "krapai", "skalbiniai"]
ROWS = """
w|keptuvė|noun|f|B1|сковорода|10677038||keptuvės
w|troškinti|verb||B2|тушить (мясо, овощи)|8047713|troškinys — рагу|troškina, troškino
w|kartus|adj||B1|горький|10753627|
w|puodas|noun|m|B1|кастрюля; горшок|||puodo
w|pjaustyti|verb||B1|резать, нарезать (на куски)|4636972|supjaustyti — нарезать (сов.)|pjausto, pjaustė
w|rūgštus|adj||B1|кислый|3594155|
w|dubuo|noun|m|B1|миска|3101651|род. п. dubens (как vanduo — vandens)|dubens
w|maišyti|verb||B1|мешать, смешивать; путать|12847749|мешать (кому-л.) — trukdyti|maišo, maišė
w|sūrus|adj||B1|солёный|11953399|не путать: sūris — сыр|
w|samtis|noun|m|B2|половник, поварёшка|10745605||samčio
w|įberti|verb||B2|всыпать, насыпать (сахар, соль)|13286794|įberti ko (род. п.)|įberia, įbėrė
w|beskonis|adj||B2|безвкусный|13600067|
w|padėklas|noun|m|B2|поднос|11695104||padėklo
w|nulupti|verb||B1|очистить (от кожуры, скорлупы)|12926979||nulupa, nulupo
w|sultingas|adj||B2|сочный|13072302|
w|šaukštelis|noun|m|B1|ложечка|12191199|arbatinis šaukštelis — чайная ложка|šaukštelio
w|tarkuoti|verb||B2|тереть на тёрке|13869458|tarkuotas sūris — тёртый сыр|tarkuoja, tarkavo
w|traškus|adj||B2|хрустящий|13692211|traškučiai — чипсы|
w|orkaitė|noun|f|B1|духовка|12856987||orkaitės
w|išvirti|verb||B1|сварить|12926967|virti — варить|išverda, išvirė
w|apkūnus|adj||B1|полный, тучный|14032028|
w|puodelis|noun|m|B1|чашка, кружка|2744656||puodelio
w|garbanotas|adj||B1|кудрявый|10099113|
w|stiklainis|noun|m|B1|стеклянная банка|13602522||stiklainio
w|žilas|adj||B1|седой|9213098|
w|padažas|noun|m|B1|соус|12120192||padažo
w|sūdyti|verb||B2|солить|13869469|sūdytas — солёный (засоленный)|sūdo, sūdė
w|plikas|adj||B1|лысый; голый|13103303|
w|troškinys|noun|m|B2|рагу|13499681||troškinio
w|užvirti|verb||B1|закипеть||užvirinti — вскипятить (что-л.)|užverda, užvirė
w|dailus|adj||B2|изящный, хорошенький|9775703|
w|užkandis|noun|m|B1|закуска|12868904|užkąsti — перекусить|užkandžio
w|skrudinti|verb||B2|поджаривать (хлеб, орехи)||skrudinta duona — поджаренный хлеб, тосты|skrudina, skrudino
w|raumeningas|adj||B2|мускулистый||raumuo — мышца|
w|valgiaraštis|noun|m|B1|меню|13192819||valgiaraščio
w|atšildyti|verb||B2|разморозить; отогреть|||atšildo, atšildė
w|išvaizdus|adj||B2|видный, привлекательный (о внешности)||išvaizda — внешность|
w|išplauti|verb||B1|вымыть (посуду, пол)|12857062|išplauti indus — помыть посуду|išplauna, išplovė
w|apsileidęs|adj||B2|неопрятный, опустившийся|12798781|apsileisti — опуститься, запустить себя|
w|porcija|noun|f|B1|порция|12850608||porcijos
w|išsiurbti|verb||B1|пропылесосить||išsiurbti kilimą — пропылесосить ковёр|išsiurbia, išsiurbė
w|sugedęs|adj||B1|сломанный; испорченный|13176850|sugesti — сломаться; испортиться|
w|kruopos|noun|f|B1|крупа|13568712|Только мн. ч.: kruopos, род. п. kruopų; manų kruopos — манка|kruopų
w|nušluostyti|verb||B1|вытереть|12788454|šluostyti — вытирать|nušluosto, nušluostė
w|grikiai|noun|m|B1|гречка||Только мн. ч.: grikiai, род. п. grikių|grikių
w|išskalbti|verb||B1|выстирать|13102357|skalbti — стирать|išskalbia, išskalbė
w|krapai|noun|m|B1|укроп||Только мн. ч.: krapai, род. п. krapų|krapų
w|išnešti|verb||B1|вынести|12726396|išnešti šiukšles — вынести мусор|išneša, išnešė
w|imbieras|noun|m|B1|имбирь|12099734||imbiero
w|apsiauti|verb||B1|обуться|13491399|apsiauti batus — надеть обувь|apsiauna, apsiavė
w|cinamonas|noun|m|B1|корица|12705376||cinamono
w|nusiauti|verb||B1|разуться|10147780||nusiauna, nusiavė
w|grietinė|noun|f|B1|сметана||grietinėlė — сливки|grietinės
w|nusivilkti|verb||B1|снять (с себя одежду)|13016420|apsivilkti — надеть|nusivelka, nusivilko
w|burokėlis|noun|m|B1|свёкла|||burokėlio
w|persirengti|verb||B1|переодеться|10720218||persirengia, persirengė
w|uogienė|noun|f|B1|варенье|4679938||uogienės
w|pasimatuoti|verb||B1|примерить|4871632||pasimatuoja, pasimatavo
w|kiaušinienė|noun|f|B1|яичница|9794420||kiaušinienės
w|nusiskusti|verb||B1|побриться|12170354|skustis — бриться|nusiskuta, nusiskuto
w|dešrelė|noun|f|B1|сосиска, колбаска|10870349||dešrelės
w|nusikirpti|verb||B1|подстричься|13383659|kirpti — стричь|nusikerpa, nusikirpo
w|indaplovė|noun|f|B1|посудомоечная машина|||indaplovės
w|šukuotis|verb||B1|причёсываться|14030649|susišukuoti — причесаться|šukuojasi, šukavosi
w|šaldiklis|noun|m|B1|морозилка|||šaldiklio
w|siurblys|noun|m|B1|насос; пылесос|13398429|dulkių siurblys — пылесос|siurblio
w|skalbiniai|noun|m|B1|бельё (для стирки)|10151597|Только мн. ч.: skalbiniai, род. п. skalbinių|skalbinių
w|skuduras|noun|m|B1|тряпка|13926350||skuduro
w|šepetys|noun|m|B1|щётка|12876648|dantų šepetėlis — зубная щётка|šepečio
w|auskaras|noun|m|B1|серьга|12290763||auskaro
w|lietpaltis|noun|m|B1|плащ|12299954||lietpalčio
w|chalatas|noun|m|B1|халат|13047072||chalato
w|kuprinė|noun|f|B1|рюкзак|10638689||kuprinės
w|rankovė|noun|f|B1|рукав|13524904||rankovės
w|apykaklė|noun|f|B1|воротник|13806190||apykaklės
w|liemenė|noun|f|B2|жилет|10237849|liemenėlė — бюстгальтер|liemenės
w|raukšlė|noun|f|B2|морщина; складка|||raukšlės
w|strazdana|noun|f|B2|веснушка|13225957|strazdanotas — веснушчатый|strazdanos
"""
