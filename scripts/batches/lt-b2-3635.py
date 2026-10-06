# Batch source for content/lt/vocab/b2-3635.yaml (B1–B2 words the learner meets in the reading texts: lemmas from the
# glossaries of content/lt/reading/*.yaml that were not vocabulary items yet — prefixed verbs, abstract nouns, news words).
# Names, violence, slang and very technical words skipped. Checked against every `text:` in content/lt.
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["lažybos", "metinės", "subtitrai"]
ROWS = """
w|pabūti|verb||B1|побыть|13623575||pabūna, pabuvo
w|imperija|noun|f|B1|империя|12862237||imperijos
w|apleistas|adj||B2|заброшенный|||
w|surinkti|verb||B1|собрать|10754817||surenka, surinko
w|netektis|noun|f|B2|утрата, потеря (близкого человека)||Ж. р.: netektis, netekties|netekties
w|palaipsniui|adv||B2|постепенно|13501403||
w|padovanoti|verb||A2|подарить|12331506|padovanoti kam ką — подарить кому что|padovanoja, padovanojo
w|medžioklė|noun|f|B1|охота|13382950||medžioklės
w|savas|adj||B1|свой, родной|13490743||
w|sudaryti|verb||B1|составить; заключить (договор)|12293108|sudaryti sąrašą — составить список; sudaryti sutartį — заключить договор|sudaro, sudarė
w|judėjimas|noun|m|B1|движение|3987750||judėjimo
w|pasiekiamas|adj||B2|достижимый, доступный|10636589||
w|paliesti|verb||B1|коснуться, тронуть; затронуть (тему)|12145127||paliečia, palietė
w|užuomina|noun|f|B2|намёк|12126491||užuominos
w|įtikinamai|adv||B2|убедительно|||
w|dominti|verb||B1|интересовать|10756109|mane domina… — меня интересует…|domina, domino
w|fantastika|noun|f|B1|фантастика|12607753|mokslinė fantastika — научная фантастика|fantastikos
w|apmokamas|adj||B2|оплачиваемый|12805629|apmokamos atostogos — оплачиваемый отпуск|
w|stoti|verb||B1|встать (в очередь, на место); поступать (в вуз), вступать|11512152|stoti į universitetą — поступать в университет; stoti į eilę — встать в очередь|stoja, stojo
w|komitetas|noun|m|B1|комитет|11852889||komiteto
w|masinis|adj||B2|массовый|||
w|pakakti|verb||B1|хватить, быть достаточным|11977287|+ род. п.: man pakanka laiko — мне хватает времени|pakanka, pakako
w|praradimas|noun|m|B2|потеря|||praradimo
w|aklai|adv||B2|слепо, вслепую|12783794||
w|sugesti|verb||B1|сломаться; испортиться|13747386|sugedo kompiuteris — сломался компьютер|sugenda, sugedo
w|šuolis|noun|m|B1|прыжок; скачок|13267363||šuolio
w|savotiškas|adj||B2|своеобразный|12121264||
w|nukreipti|verb||B2|направить|13708066||nukreipia, nukreipė
w|gentis|noun|f|B2|племя|2991415|Ж. р.: gentis, genties|genties
w|tautinis|adj||B1|национальный, народный|13529031|tautinis kostiumas — национальный костюм|
w|paskirti|verb||B1|назначить|13644685||paskiria, paskyrė
w|maišas|noun|m|B1|мешок|13445120||maišo
w|slapčia|adv||B2|тайком, тайно|||
w|spausti|verb||B1|давить, жать; нажимать|13364360|spausti ranką — пожимать руку|spaudžia, spaudė
w|malonė|noun|f|B2|милость; одолжение|||malonės
w|melagingas|adj||B2|ложный, лживый|10706098|melagingos žinios — ложные новости|
w|nunešti|verb||B1|отнести; унести|13913979||nuneša, nunešė
w|kūrėjas|noun|m|B1|создатель, автор|14044911||kūrėjo
w|matomas|adj||B2|видимый; заметный|12729702||
w|perspėti|verb||B1|предупредить|10711947|perspėti apie ką — предупредить о чём|perspėja, perspėjo
w|lažybos|noun|f|B2|пари; ставки|11485177|Только мн. ч.: lažybos, род. п. lažybų; kirsti lažybų — заключить пари, поспорить|lažybų
w|noriai|adv||B1|охотно|||
w|rengti|verb||B1|устраивать, организовывать; готовить|13576997||rengia, rengė
w|režimas|noun|m|B1|режим|13395339||režimo
w|nemažas|adj||B1|немалый, довольно большой|10697083||
w|nuveikti|verb||B2|сделать, совершить (много)|11581262|daug nuveikti — много сделать|nuveikia, nuveikė
w|atranka|noun|f|B2|отбор|||atrankos
w|išsiblaškęs|adj||B2|рассеянный|4171275|Причастие: išsiblaškęs, išsiblaškiusi|
w|pažvelgti|verb||B1|взглянуть|12386167|pažvelgti į ką — взглянуть на что|pažvelgia, pažvelgė
w|tvirtovė|noun|f|B2|крепость|10706365||tvirtovės
w|požeminis|adj||B2|подземный|4781535||
w|paaukoti|verb||B2|пожертвовать|12979149||paaukoja, paaukojo
w|privatumas|noun|m|B2|частная жизнь, приватность|||privatumo
w|senamadiškas|adj||B1|старомодный|14056518||
w|patenkinti|verb||B2|удовлетворить|11537388|patenkintas — довольный|patenkina, patenkino
w|elnias|noun|m|B1|олень|13655955||elnio
w|užterštas|adj||B2|загрязнённый|||
w|numesti|verb||B1|сбросить, бросить (вниз)|2608776|numesti svorio — похудеть|numeta, numetė
w|metinės|noun|f|B2|годовщина|12905155|Только мн. ч.: metinės, род. п. metinių|metinių
w|ištarti|verb||B1|произнести|9936815||ištaria, ištarė
w|mąstymas|noun|m|B2|мышление|13554831|kritinis mąstymas — критическое мышление|mąstymo
w|atkeliauti|verb||B2|прибыть, прийти (издалека)|13691812||atkeliauja, atkeliavo
w|psichika|noun|f|B2|психика|13712415||psichikos
w|atšvęsti|verb||B1|отпраздновать|12754926||atšvenčia, atšventė
w|subtitrai|noun|m|B1|субтитры|13104778|Обычно мн. ч.: subtitrai, род. п. subtitrų|subtitrų
w|kasti|verb||B1|копать|12792382||kasa, kasė
w|mediena|noun|f|B2|древесина|3594572||medienos
w|sieti|verb||B2|связывать; ассоциировать|13727209|sieti ką su kuo — связывать что с чем|sieja, siejo
w|suvokimas|noun|m|B2|восприятие, понимание|12682654||suvokimo
w|nuspėti|verb||B2|предсказать, угадать|12684410||nuspėja, nuspėjo
w|apžvalga|noun|f|B2|обзор|10265358||apžvalgos
w|teikti|verb||B2|предоставлять, оказывать|10721251|teikti paslaugas — оказывать услуги|teikia, teikė
w|pažintis|noun|f|B1|знакомство|13726715|мн. ч. pažintys — знакомства, связи|pažinties
w|tilpti|verb||B1|поместиться, помещаться|2744657||telpa, tilpo
w|prieglauda|noun|f|B2|приют|13791345|gyvūnų prieglauda — приют для животных|prieglaudos
w|atsiverti|verb||B2|открыться, раскрыться|2457927||atsiveria, atsivėrė
w|kumštis|noun|m|B1|кулак|10592011||kumščio
w|lūžti|verb||B1|сломаться, переломиться|4641875||lūžta, lūžo
w|vedėjas|noun|m|B2|ведущий (программы); заведующий|13045614||vedėjo
w|susimokėti|verb||B1|заплатить (за себя)|13018797|kiekvienas susimoka už save — каждый платит за себя|susimoka, susimokėjo
w|prabanga|noun|f|B2|роскошь|13597028||prabangos
w|užimti|verb||B1|занять|10106639|užimti vietą — занять место|užima, užėmė
w|plotas|noun|m|B1|площадь (размер)|12096049||ploto
w|provincija|noun|f|B1|провинция|12922731||provincijos
"""
