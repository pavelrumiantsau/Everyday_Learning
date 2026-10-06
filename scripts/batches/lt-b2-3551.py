# Batch source for content/lt/vocab/b2-3551.yaml (B1–B2 words the learner meets in the reading texts: lemmas from the
# glossaries of content/lt/reading/*.yaml that were not vocabulary items yet — mostly frequent verbs and nouns that
# earlier frequency batches skipped). Names, violence, slang and very technical words skipped. Checked against every
# `text:` in content/lt. Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example.
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["vartai", "lenktynės", "šiukšlės", "laidotuvės", "ištekliai"]
ROWS = """
w|tapti|verb||A2|стать, становиться|3954185|tapti kuo (твор. п.): tapo gydytoju — стал врачом|tampa, tapo
w|garbė|noun|f|B1|честь|13402894|garbės žodis — честное слово|garbės
w|seniai|adv||A2|давно|13196556|seniai matyti — давно не виделись|
w|tekti|verb||B1|приходиться; доставаться|13436866|кому — дат. п.: man teko laukti — мне пришлось ждать|tenka, teko
w|bėda|noun|f|B1|беда; проблема|11489843|bėda ta, kad… — беда в том, что…|bėdos
w|tobulas|adj||B1|совершенный, идеальный|13344235||
w|nutikti|verb||B1|случиться, произойти|12968223|Kas nutiko? — Что случилось?|nutinka, nutiko
w|siela|noun|f|B1|душа|13529072||sielos
w|pernelyg|adv||B1|слишком, чрезмерно|9870150||
w|likti|verb||A2|остаться, оставаться|13364738||lieka, liko
w|netiesa|noun|f|B1|неправда|13272531||netiesos
w|amžinas|adj||B1|вечный|13006062||
w|parašyti|verb||A2|написать|4636690||parašo, parašė
w|vartai|noun|m|B1|ворота|12225348|Только мн. ч.: vartai, род. п. vartų|vartų
w|verčiau|adv||B1|лучше (предпочтительнее)|12017976|verčiau eik namo — лучше иди домой|
w|veikti|verb||B1|действовать; работать (о машине, учреждении)|10715275|muziejus veikia — музей работает|veikia, veikė
w|karta|noun|f|B1|поколение|12120074|не путать: kartą — однажды (от kartas — раз)|kartos
w|lygus|adj||B1|ровный; равный|5178273||
w|leisti|verb||A2|разрешать, позволять; проводить (время)|12289605|leisti kam + инф. — разрешать кому; leisti laiką — проводить время|leidžia, leido
w|dvasia|noun|f|B1|дух|11900228||dvasios
w|veltui|adv||B1|напрасно; даром|2693490||
w|prasidėti|verb||A2|начаться, начинаться|13553435||prasideda, prasidėjo
w|banga|noun|f|B1|волна|13681148||bangos
w|vidinis|adj||B1|внутренний|||
w|surasti|verb||B1|найти, отыскать|12511442||suranda, surado
w|sunkvežimis|noun|m|B1|грузовик|3592948||sunkvežimio
w|kaskart|adv||B1|каждый раз|||
w|skambėti|verb||B1|звучать; звенеть|13059069||skamba, skambėjo
w|triukšmas|noun|m|B1|шум|13044016||triukšmo
w|smagus|adj||B1|весёлый, приятный|8812691|smagu — весело, приятно|
w|įvykti|verb||B1|произойти, состояться|10724030||įvyksta, įvyko
w|miestelis|noun|m|B1|городок, местечко|2775114||miestelio
w|atskirai|adv||B1|отдельно|12178545||
w|tikėti|verb||A2|верить|13321499|tikėti kuo (твор. п.): tikėti Dievu; tikėti kam (дат. п.) — верить кому|tiki, tikėjo
w|lenktynės|noun|f|B1|гонки, состязание в скорости|11818249|Только мн. ч.: lenktynės, род. п. lenktynių|lenktynių
w|ryškus|adj||B1|яркий; явный, отчётливый|4782886||
w|paklausti|verb||A2|спросить|2182511|paklausti ko (род. п.): paklausk mamos — спроси маму|paklausia, paklausė
w|dėžė|noun|f|B1|ящик, коробка|13524276||dėžės
w|tiesiogiai|adv||B1|прямо, непосредственно|13755236||
w|pasisekti|verb||B1|удаться; повезти|10472468|кому — дат. п.: man pasisekė — мне повезло|pasiseka, pasisekė
w|valtis|noun|f|B1|лодка|12735857|Ж. р.: valtis, valties (как naktis)|valties
w|viešas|adj||B1|общественный, публичный|13173890||
w|judėti|verb||B1|двигаться|10510715||juda, judėjo
w|šiukšlės|noun|f|B1|мусор|12713797|Обычно мн. ч.: šiukšlės, род. п. šiukšlių|šiukšlių
w|grynas|adj||B1|чистый|11526272|grynieji pinigai — наличные|
w|pasiekti|verb||B1|достичь; добраться|2752722|pasiekti tikslą — достичь цели|pasiekia, pasiekė
w|laidotuvės|noun|f|B2|похороны|13566611|Только мн. ч.: laidotuvės, род. п. laidotuvių|laidotuvių
w|išgerti|verb||A2|выпить|3149676||išgeria, išgėrė
w|erdvė|noun|f|B1|пространство||kosminė erdvė — космос|erdvės
w|sustabdyti|verb||B1|остановить|13006379||sustabdo, sustabdė
w|naujokas|noun|m|B1|новичок|10277500||naujoko
w|kalbėtis|verb||B1|разговаривать (друг с другом)|12190632|kalbėtis su kuo — разговаривать с кем|kalbasi, kalbėjosi
w|juokas|noun|m|B1|смех|4871589||juoko
w|pasikalbėti|verb||A2|поговорить|9839738||pasikalba, pasikalbėjo
w|kaukė|noun|f|B1|маска|12695135||kaukės
w|imtis|verb||B2|взяться (за что-л.)|12941147|+ род. п.: imtis darbo — взяться за работу|imasi, ėmėsi
w|dugnas|noun|m|B1|дно|10801379||dugno
w|sektis|verb||B1|удаваться, идти (о делах)|13396836|Kaip sekasi? — Как дела?|sekasi, sekėsi
w|dėžutė|noun|f|B1|коробочка, шкатулка|10976700||dėžutės
w|pasirodyti|verb||B1|появиться; оказаться; показаться|10510008|pasirodė, kad… — оказалось, что…; man pasirodė — мне показалось|pasirodo, pasirodė
w|našta|noun|f|B2|бремя, ноша|8187675||naštos
w|versti|verb||B1|переводить (текст); переворачивать|12187038|versti iš lietuvių kalbos į rusų|verčia, vertė
w|ištekliai|noun|m|B2|ресурсы|13783049|Обычно мн. ч.: ištekliai, род. п. išteklių|išteklių
w|papasakoti|verb||A2|рассказать|3960502||papasakoja, papasakojo
w|liaudis|noun|f|B1|народ (простые люди)|13244969|liaudies daina — народная песня|liaudies
w|paprašyti|verb||A2|попросить|12773705|paprašyti ko (род. п.): paprašyti pagalbos|paprašo, paprašė
w|darželis|noun|m|A2|детский сад|11790274|полностью: vaikų darželis|darželio
w|perduoti|verb||B1|передать|13031909||perduoda, perdavė
w|pramonė|noun|f|B1|промышленность|2740304||pramonės
w|skirti|verb||B1|выделять, уделять; предназначать|12097089|skirti laiko — уделять время; skirtas kam — предназначенный для|skiria, skyrė
w|skyrius|noun|m|B1|отдел; глава (книги)|13644701||skyriaus
w|paversti|verb||B2|превратить|4143030|paversti kuo (твор. п.) — превратить во что|paverčia, pavertė
w|narys|noun|m|B1|член (организации, семьи)|12331707||nario
w|dėvėti|verb||B1|носить (одежду)|1604405||dėvi, dėvėjo
w|pilis|noun|f|B1|замок (крепость)|8175343|Ж. р.: pilis, pilies|pilies
w|minėti|verb||B1|упоминать; отмечать (годовщину)|13833562||mini, minėjo
w|medus|noun|m|A2|мёд|9955121||medaus
w|kartoti|verb||B1|повторять|4087609||kartoja, kartojo
w|juosta|noun|f|B1|лента; полоса|2628329|eismo juosta — полоса движения|juostos
w|dalytis|verb||B1|делиться|12097821|dalytis kuo (твор. п.) su kuo — делиться чем с кем|dalijasi, dalijosi
w|krepšys|noun|m|B1|сумка; корзина|10189877||krepšio
w|linkėti|verb||B1|желать (кому-л. чего-л.)|1673808|linkėti kam ko: linkiu sėkmės — желаю удачи|linki, linkėjo
w|patiekalas|noun|m|B1|блюдо (кушанье)|1626612||patiekalo
w|remtis|verb||B2|опираться, основываться|11572688|remtis kuo (твор. п.); remiantis — на основании|remiasi, rėmėsi
"""
