# Batch source for content/lt/vocab/b2-2555.yaml (B1→B2 topic gaps: sports & hobbies, culture & arts, law & crime;
# topic checklist against existing vocabulary, plus lemmas from frequency ranks 35000–47000).
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT, PLAN "Inputs…" 3).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["varžybos", "rungtynės", "lygiosios"]
ROWS = """
w|treniruotė|noun|f|B1|тренировка|12733185||treniruotės
w|treniruotis|verb||B1|тренироваться|13687622||treniruojasi, treniravosi
w|ištvermingas|adj||B2|выносливый|7133873|ištvermė — выносливость|
w|treneris|noun|m|B1|тренер|12530659||trenerio
w|sirgti|verb||B1|болеть (чем-л.); болеть (за команду)|11459152|sirgti už ką — болеть за кого|serga, sirgo
w|sportiškas|adj||B1|спортивный (о человеке)|12120006|sportinis — спортивный (о вещах: sportinis kostiumas)|
w|varžybos|noun|f|B1|соревнования|12927144|Только мн. ч.: varžybos, род. п. varžybų|varžybų
w|įmušti|verb||B1|забить (гол)|13505896||įmuša, įmušė
w|nekaltas|adj||B1|невиновный; невинный|13522390||
w|rungtynės|noun|f|B1|матч, игра|12127842|Только мн. ч.: rungtynės, род. п. rungtynių|rungtynių
w|pataikyti|verb||B1|попасть (в цель)|11647539|pataikyti į ką|pataiko, pataikė
w|dokumentinis|adj||B1|документальный|8252016|dokumentinis filmas — документальный фильм|
w|sirgalius|noun|m|B1|болельщик|13765642||sirgaliaus
w|slidinėti|verb||B1|кататься на лыжах|2606213|slidės — лыжи|slidinėja, slidinėjo
w|čempionatas|noun|m|B1|чемпионат|3951893||čempionato
w|čiuožti|verb||B1|кататься на коньках; скользить|3117146|pačiūžos — коньки|čiuožia, čiuožė
w|čempionas|noun|m|B1|чемпион|8404663||čempiono
w|megzti|verb||B1|вязать|12386311|megztinis — свитер|mezga, mezgė
w|įvartis|noun|m|B1|гол|2609474|pelnyti / įmušti įvartį — забить гол|įvarčio
w|siuvinėti|verb||B2|вышивать|2744610||siuvinėja, siuvinėjo
w|lygiosios|noun|f|B2|ничья||Только мн. ч.: lygiosios, род. п. lygiųjų; rungtynės baigėsi lygiosiomis — матч закончился вничью|lygiųjų
w|kolekcionuoti|verb||B1|коллекционировать|11334491||kolekcionuoja, kolekcionavo
w|pralaimėjimas|noun|m|B1|поражение, проигрыш|12959897|pralaimėti — проиграть|pralaimėjimo
w|fotografuoti|verb||B1|фотографировать|10874008||fotografuoja, fotografavo
w|rekordas|noun|m|B1|рекорд|12140060||rekordo
w|grybauti|verb||B1|собирать грибы|||grybauja, grybavo
w|nugalėtojas|noun|m|B1|победитель|13454059||nugalėtojo
w|žvejoti|verb||B1|ловить рыбу, рыбачить|12741865|žvejys — рыбак|žvejoja, žvejojo
w|maratonas|noun|m|B1|марафон|12892774||maratono
w|ploti|verb||B1|хлопать, аплодировать|12359206|plojimai — аплодисменты|ploja, plojo
w|čiuožykla|noun|f|B1|каток|8979687||čiuožyklos
w|vaidinti|verb||B1|играть (роль); притворяться|2991384||vaidina, vaidino
w|baseinas|noun|m|B1|бассейн|6453465||baseino
w|liudyti|verb||B2|давать показания; свидетельствовать|1605778|liudytojas — свидетель|liudija, liudijo
w|aikštelė|noun|f|B1|площадка; стоянка|2775086|stovėjimo aikštelė — парковка|aikštelės
w|nuteisti|verb||B2|осудить, приговорить|||nuteisia, nuteisė
w|pomėgis|noun|m|B1|хобби, увлечение|9788700||pomėgio
w|suimti|verb||B2|арестовать, задержать|14042724||suima, suėmė
w|dėlionė|noun|f|B1|пазл|13358894||dėlionės
w|nusikalsti|verb||B2|совершить преступление|||nusikalsta, nusikalto
w|kryžiažodis|noun|m|B1|кроссворд|9938433||kryžiažodžio
w|kolekcija|noun|f|B1|коллекция|13103129||kolekcijos
w|bėgimas|noun|m|B1|бег; забег|13395907||bėgimo
w|ištvermė|noun|f|B2|выносливость|||ištvermės
w|galerija|noun|f|B1|галерея|12100657||galerijos
w|spektaklis|noun|m|B1|спектакль|6020160||spektaklio
w|premjera|noun|f|B2|премьера||не путать: premjeras — премьер-министр|premjeros
w|scena|noun|f|B1|сцена|13054583||scenos
w|skulptūra|noun|f|B2|скульптура|||skulptūros
w|skulptorius|noun|m|B2|скульптор|11060733||skulptoriaus
w|tapyba|noun|f|B2|живопись|13538212|tapyti — писать красками|tapybos
w|paveikslas|noun|m|B1|картина|10458161||paveikslo
w|drobė|noun|f|B2|холст, полотно|12347001||drobės
w|teptukas|noun|m|B2|кисть (для рисования)|||teptuko
w|poezija|noun|f|B1|поэзия|10662337||poezijos
w|apsakymas|noun|m|B1|рассказ (литературный)|11633221||apsakymo
w|repeticija|noun|f|B2|репетиция|||repeticijos
w|dirigentas|noun|m|B2|дирижёр|11965748||dirigento
w|choras|noun|m|B1|хор|||choro
w|baletas|noun|m|B1|балет|||baleto
w|eksponatas|noun|m|B2|экспонат|13516120||eksponato
w|režisierius|noun|m|B1|режиссёр|13772966||režisieriaus
w|advokatas|noun|m|B1|адвокат|11259517||advokato
w|prokuroras|noun|m|B2|прокурор|||prokuroro
w|kaltinamasis|noun|m|B2|обвиняемый, подсудимый||kaltinti — обвинять; род. п. kaltinamojo|kaltinamojo
w|nuosprendis|noun|m|B2|приговор|||nuosprendžio
w|bauda|noun|f|B1|штраф|12065725||baudos
w|kalėjimas|noun|m|B1|тюрьма|2991391||kalėjimo
w|kalinys|noun|m|B2|заключённый|10244868||kalinio
w|nusikaltėlis|noun|m|B1|преступник|3627157|nusikaltimas — преступление|nusikaltėlio
w|sukčius|noun|m|B2|мошенник, жулик|11076573||sukčiaus
w|vagis|noun|m|B1|вор|12871383|род. п. vagies|vagies
w|kyšininkavimas|noun|m|B2|взяточничество|11346936|kyšis — взятка|kyšininkavimo
w|užstatas|noun|m|B2|залог (денежный)|||užstato
w|apklausa|noun|f|B2|опрос; допрос|13752007||apklausos
w|tardytojas|noun|m|B2|следователь|10735654||tardytojo
"""
