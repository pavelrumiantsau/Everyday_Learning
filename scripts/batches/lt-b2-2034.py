# Batch source for content/lt/vocab/b2-2034.yaml (B1→B2 topic gaps: emotions, health, housing; a few lemmas from
# frequency ranks 35000–47000).
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT, PLAN "Inputs…" 3).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["laiptai", "tapetai"]
ROWS = """
w|pasitenkinimas|noun|m|B2|удовлетворение|12859190|teikti pasitenkinimą — приносить удовлетворение|pasitenkinimo
w|užjausti|verb||B1|сочувствовать|11682675|užjausti ką (вин. п.) — сочувствовать кому|užjaučia, užjautė
w|nusivylęs|adj||B1|разочарованный|13407685|nusivylęs kuo (тв. п.) — разочарован в ком/чём|
w|nekantrumas|noun|m|B2|нетерпение|11284640|degti iš nekantrumo — сгорать от нетерпения|nekantrumo
w|gėdytis|verb||B1|стыдиться, стесняться|12178449|gėdytis ko (род. п.)|gėdijasi, gėdijosi
w|pasipiktinimas|noun|m|B2|возмущение|11566196||pasipiktinimo
w|sutrikęs|adj||B2|растерянный, смущённый|10716942|
w|sielvartas|noun|m|B2|горе, скорбь|11940468||sielvarto
w|piktintis|verb||B2|возмущаться||piktinti — злить, возмущать (кого-л.)|piktinasi, piktinosi
w|jaudulys|noun|m|B1|волнение|11651595||jaudulio
w|susirūpinęs|adj||B1|обеспокоенный|12506670|susirūpinęs kuo / dėl ko — обеспокоен чем|
w|nuoskauda|noun|f|B2|обида|10190899||nuoskaudos
w|susigėsti|verb||B2|смутиться, устыдиться|13520669||susigėsta, susigėdo
w|susižavėjimas|noun|m|B2|восхищение|10574900||susižavėjimo
w|išsigąsti|verb||B1|испугаться|12231829|išsigąsti ko (род. п.); išgąsdinti — напугать|išsigąsta, išsigando
w|nustebęs|adj||B1|удивлённый|10217985|
w|ligoninė|noun|f|A2|больница|12464260|gulėti ligoninėje — лежать в больнице|ligoninės
w|kraujospūdis|noun|m|B2|кровяное давление|11993235|matuoti kraujospūdį — измерять давление|kraujospūdžio
w|nusiraminti|verb||B1|успокоиться|13495692|nuraminti — успокоить (кого-л.)|nusiramina, nusiramino
w|nekantrus|adj||B1|нетерпеливый|12922482|
w|sloga|noun|f|B1|насморк|13102342|man sloga — у меня насморк|slogos
w|susijaudinti|verb||B1|разволноваться|10832175||susijaudina, susijaudino
w|peršalimas|noun|m|B1|простуда|10253415||peršalimo
w|susierzinęs|adj||B2|раздражённый|||
w|žaizda|noun|f|B1|рана|9442426||žaizdos
w|pavyduliauti|verb||B2|ревновать|13503640||pavyduliauja, pavydulavo
w|tabletė|noun|f|A2|таблетка|12865864||tabletės
w|irzlus|adj||B2|раздражительный|13235314|
w|mankšta|noun|f|B1|зарядка, гимнастика|12960018|daryti mankštą — делать зарядку|mankštos
w|persišaldyti|verb||B1|простудиться|11461652||persišaldo, persišaldė
w|antsvoris|noun|m|B2|лишний вес|13612077|turėti antsvorio (род. п.)|antsvorio
w|karščiuoti|verb||B1|температурить, иметь жар|13488835|karščiavimas — жар, лихорадка|karščiuoja, karščiavo
w|užkrečiamas|adj||B1|заразный|11580811|
w|imunitetas|noun|m|B2|иммунитет|10781664||imuniteto
w|diagnozė|noun|f|B2|диагноз|13632938|diagnozuoti — поставить диагноз|diagnozės
w|kosėti|verb||B1|кашлять|12341679|наст. вр. также kosi; kosulys — кашель|kosėja, kosėjo
w|chirurgas|noun|m|B2|хирург|8122690||chirurgo
w|skausmingas|adj||B1|болезненный|11208943|
w|čiaudėti|verb||B1|чихать|13736148||čiaudi, čiaudėjo
w|migrena|noun|f|B2|мигрень|12918709||migrenos
w|stomatologas|noun|m|B1|стоматолог|12225074|eiti pas stomatologą — идти к стоматологу|stomatologo
w|neramus|adj||B1|беспокойный, неспокойный|12419363|
w|svaigti|verb||B1|кружиться (о голове)|10686721|man svaigsta galva — у меня кружится голова|svaigsta, svaigo
w|daugiabutis|noun|m|B1|многоквартирный дом|13097253|daugiabutis namas|daugiabučio
w|negaluoti|verb||B2|недомогать, нездоровиться|12427282||negaluoja, negalavo
w|sklypas|noun|m|B2|участок (земли)|13499137|žemės sklypas — земельный участок|sklypo
w|patiklus|adj||B2|доверчивый|11832985|
w|rūsys|noun|m|B1|подвал, погреб|10868125||rūsio
w|apsinuodyti|verb||B2|отравиться|12625252|apsinuodyti kuo (тв. п.)|apsinuodija, apsinuodijo
w|laiptai|noun|m|A2|лестница|13197367|lipti laiptais — подниматься по лестнице|laiptų
w|ciniškas|adj||B2|циничный|12705364|
w|miegamasis|noun|m|A2|спальня|11268508|склоняется как прилагательное: miegamajame — в спальне|miegamojo
w|sportuoti|verb||A2|заниматься спортом|13713850||sportuoja, sportavo
w|tapetai|noun|m|B1|обои|13529166||tapetų
w|išrankus|adj||B2|разборчивый, привередливый|10275413|išrankus kam (дат. п.) — разборчив в чём|
w|remontuoti|verb||B1|ремонтировать, чинить|11938425|suremontuoti — отремонтировать|remontuoja, remontavo
w|vandentiekis|noun|m|B2|водопровод|13606790||vandentiekio
w|užtrauktukas|noun|m|B1|молния (застёжка)|12725256||užtrauktuko
w|nesubrendęs|adj||B2|незрелый|13401002|
w|apstatyti|verb||B2|обставить (мебелью)|12646735|apstatyti butą baldais|apstato, apstatė
w|šildytuvas|noun|m|B1|обогреватель|8339385|šildymas — отопление|šildytuvo
w|išnuomoti|verb||B1|сдать в аренду|13739833|išsinuomoti — снять, арендовать (себе)|išnuomoja, išnuomojo
w|nuomininkas|noun|m|B2|арендатор, квартиросъёмщик|||nuomininko
w|gyvenamasis|adj||B2|жилой|12744031|gyvenamoji vieta — место жительства|
w|nuomotojas|noun|m|B2|арендодатель|||nuomotojo
w|vėdinti|verb||B2|проветривать|||vėdina, vėdino
w|skersvėjis|noun|m|B2|сквозняк|13814226||skersvėjo
w|tvanku|adv||B1|душно|12554617|
w|nuovargis|noun|m|B1|усталость|13760730||nuovargio
w|susivaldyti|verb||B2|сдержаться, совладать с собой|13108425||susivaldo, susivaldė
w|kirpykla|noun|f|B1|парикмахерская|12983839||kirpyklos
w|paranku|adv||B2|удобно, выгодно (кому-л.)|13053278|
w|įsikurti|verb||B2|обосноваться, поселиться; располагаться|13097232||įsikuria, įsikūrė
w|nutukimas|noun|m|B2|ожирение|11701934||nutukimo
"""
