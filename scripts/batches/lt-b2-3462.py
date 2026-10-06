# Batch source for content/lt/vocab/b2-3462.yaml (B1–B2 words from frequency candidates `pnpm content:candidates lt 47000 6000`
# and the unused rest of `lt 41000` / `lt 35000`, reduced to lemmas: home & everyday objects, food, nature, weather, culture,
# prefixed verbs). Names, violence, slang and very technical words skipped. Checked against every `text:` in content/lt.
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["garstyčios", "konservai", "marškinėliai", "prieskoniai", "stabdžiai", "šachmatai", "ūsai"]
ROWS = """
w|gulti|verb||A2|ложиться|12105589|eiti gulti — идти спать; atsigulti — лечь|gula, gulė
w|romanas|noun|m|B1|роман (книга)|12560990|meilės romanas — любовный роман|romano
w|vakarykštis|adj||B1|вчерашний|10584528||
w|apsitvarkyti|verb||B1|прибраться; привести себя в порядок|12869312||apsitvarko, apsitvarkė
w|marškinėliai|noun|m|B1|футболка|10269844|Только мн. ч.: marškinėliai, род. п. marškinėlių (marškiniai — рубашка)|marškinėlių
w|gazuotas|adj||B1|газированный|10165637|negazuotas vanduo — негазированная вода|
w|kirpti|verb||B1|стричь; резать (ножницами)|12155117|kirptis — стричься (у парикмахера)|kerpa, kirpo
w|atvirukas|noun|m|B1|открытка|10529281||atviruko
w|liesas|adj||B1|худой; нежирный (о мясе, молоке)|13048861||
w|bičiulis|noun|m|B1|приятель, друг|10518108||bičiulio
w|giedras|adj||B1|ясный, безоблачный|11293298||
w|nudažyti|verb||B1|покрасить|3179361||nudažo, nudažė
w|eglutė|noun|f|B1|ёлочка; новогодняя ёлка|11426837||eglutės
w|vėjuotas|adj||B1|ветреный|10513992||
w|pasipuošti|verb||B1|нарядиться, украситься|8792830||pasipuošia, pasipuošė
w|garstyčios|noun|f|B1|горчица|11900274|Только мн. ч.: garstyčios, род. п. garstyčių|garstyčių
w|spalvotas|adj||B1|цветной|13722090||
w|važinėti|verb||B1|ездить, кататься (туда-сюда)|11257565|važinėti dviračiu — кататься на велосипеде|važinėja, važinėjo
w|krioklys|noun|m|B1|водопад|13310446||krioklio
w|priekinis|adj||B1|передний|12464344||
w|vedžioti|verb||B1|водить (туда-сюда); выгуливать|13075655|vedžioti šunį — выгуливать собаку|vedžioja, vedžiojo
w|skylė|noun|f|B1|дыра, дырка|8313145||skylės
w|užpakalinis|adj||B1|задний|12884104||
w|džiūti|verb||B1|сохнуть|12164514||džiūsta, džiūvo
w|virdulys|noun|m|B1|чайник|||virdulio
w|viršutinis|adj||B1|верхний|13758799||
w|šaldyti|verb||B1|замораживать; охлаждать|||šaldo, šaldė
w|nosinė|noun|f|B1|носовой платок|12193094||nosinės
w|vakarinis|adj||B1|вечерний; западный|11529028||
w|pripilti|verb||B1|налить (доверху), наполнить|11487714||pripila, pripylė
w|piliulė|noun|f|B1|таблетка, пилюля|12338556||piliulės
w|audringas|adj||B2|бурный, штормовой|12419356||
w|prisėsti|verb||B1|присесть|9776174||prisėda, prisėdo
w|klaviatūra|noun|f|B1|клавиатура|12116598||klaviatūros
w|gaivus|adj||B2|свежий, освежающий|13689719||
w|užsimerkti|verb||B1|закрыть глаза, зажмуриться|3594246||užsimerkia, užsimerkė
w|paklodė|noun|f|B1|простыня|13828132||paklodės
w|violetinis|adj||B1|фиолетовый|10679304||
w|žemynas|noun|m|B1|материк, континент|||žemyno
w|tuojau|adv||A2|сейчас же, сразу; скоро|11566390||
w|nusnūsti|verb||B2|вздремнуть|12788232||nusnūsta, nusnūdo
w|vaivorykštė|noun|f|B1|радуга|3213848||vaivorykštės
w|užtrenkti|verb||B2|захлопнуть|7840853||užtrenkia, užtrenkė
w|ūsai|noun|m|B1|усы|8056130|Только мн. ч.: ūsai, род. п. ūsų|ūsų
w|pasivyti|verb||B1|догнать|11552226||pasiveja, pasivijo
w|skyrium|adv||B2|отдельно, порознь|12178549||
w|pasižadėti|verb||B2|пообещать, обязаться|10485099||pasižada, pasižadėjo
w|pašerti|verb||B1|покормить (животных)|12234350||pašeria, pašėrė
w|prieskoniai|noun|m|B1|специи, пряности|11485375|Обычно во мн. ч.: prieskoniai, род. п. prieskonių|prieskonių
w|persiųsti|verb||B1|переслать; перевести (деньги)|13811904||persiunčia, persiuntė
w|prajuokinti|verb||B2|рассмешить|4648401||prajuokina, prajuokino
w|suremontuoti|verb||B1|отремонтировать|11224115||suremontuoja, suremontavo
w|triukšmauti|verb||B1|шуметь|13227881||triukšmauja, triukšmavo
w|konservai|noun|m|B1|консервы||Только мн. ч.: konservai, род. п. konservų|konservų
w|padalinti|verb||B1|разделить|13056160||padalina, padalino
w|išgąsdinti|verb||B1|напугать|3937682||išgąsdina, išgąsdino
w|išjuokti|verb||B2|высмеять|12883526||išjuokia, išjuokė
w|šachmatai|noun|m|B1|шахматы|10753478|Только мн. ч.: šachmatai, род. п. šachmatų; žaisti šachmatais — играть в шахматы|šachmatų
w|klausinėti|verb||B1|расспрашивать|12292958||klausinėja, klausinėjo
w|stabdžiai|noun|m|B2|тормоза|10536349|Обычно во мн. ч.: stabdžiai, род. п. stabdžių|stabdžių
w|bokštas|noun|m|B1|башня|2668287||bokšto
w|pušis|noun|f|B1|сосна|13256138|Женский род; род. п. pušies|pušies
w|abėcėlė|noun|f|A2|алфавит, азбука|12451657||abėcėlės
w|enciklopedija|noun|f|B1|энциклопедия|3182331||enciklopedijos
w|nutrūkti|verb||B2|оборваться, прерваться|3614947||nutrūksta, nutrūko
w|operuoti|verb||B2|оперировать|11547299||operuoja, operavo
w|keliautojas|noun|m|B1|путешественник|2741079|keliautoja — путешественница|keliautojo
w|padengti|verb||B2|покрыть (и о расходах)|12118334||padengia, padengė
w|pardavinėti|verb||B1|продавать (обычно, многократно)|13709360||pardavinėja, pardavinėjo
w|pasveikinimas|noun|m|B1|поздравление|13880223||pasveikinimo
w|pauzė|noun|f|B1|пауза, перерыв|13016909||pauzės
w|žengti|verb||B2|шагать, ступать|4733057||žengia, žengė
w|piknikas|noun|m|B1|пикник|11613072||pikniko
w|plotis|noun|m|B1|ширина|3226716||pločio
w|barti|verb||B1|ругать, бранить||+ вин. п.: barti vaiką; bartis — ругаться (между собой)|bara, barė
w|bandelė|noun|f|B1|булочка|5989041||bandelės
w|krūmas|noun|m|B1|куст|11931506||krūmo
w|laidas|noun|m|B1|провод|||laido
w|priemiestis|noun|m|B1|пригород|8638531||priemiesčio
w|siunta|noun|f|B1|посылка, отправление|13675901||siuntos
w|srautas|noun|m|B2|поток|10981324||srauto
w|suolas|noun|m|B1|скамья, скамейка|10237786||suolo
w|sužadėtinė|noun|f|B1|невеста (помолвленная)|13043122|sužadėtinis — жених|sužadėtinės
w|ventiliatorius|noun|m|B1|вентилятор|13176850||ventiliatoriaus
w|vienetas|noun|m|B1|единица|13268957||vieneto
w|žibintuvėlis|noun|m|B1|фонарик|11497268||žibintuvėlio
w|išeiginė|noun|f|B1|выходной (день)|12097966|išeiginės — выходные|išeiginės
w|gimnastika|noun|f|B1|гимнастика; зарядка|13875186||gimnastikos
w|architektūra|noun|f|B1|архитектура|12520788||architektūros
"""
