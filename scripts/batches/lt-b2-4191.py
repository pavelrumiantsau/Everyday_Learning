# Batch source for content/lt/vocab/b2-4191.yaml (B1–B2 words that were never cards, from the top-10k frequency gap check —
# see lt-a1-3951.py: forms of the frequency list lemmatised, lemmas without an exact `text:` in content/lt listed; names,
# film-only, vulgar and violence words skipped). Most frequent first: reikšti, privalėti, mirtis, laikytis, rūpėti…
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["smegenys", "rūmai"]
ROWS = """
w|reikšti|verb||B1|значить, означать; выражать|1600766|Ką tai reiškia? — Что это значит?|reiškia, reiškė
w|mirtis|noun|f|B1|смерть|2016760|Ж. р.: mirtis, род. п. mirties|mirties
w|privalėti|verb||B1|быть обязанным, быть должным|7022908|privalai — ты обязан (строже, чем turi)|privalo, privalėjo
w|tuomet|adv||B1|тогда|3088674|= tada|
w|laikytis|verb||B1|держаться; соблюдать|10602365|laikytis taisyklių — соблюдать правила (+ род. п.); Laikykis! — Держись!|laikosi, laikėsi
w|protas|noun|m|B1|ум, разум|10287132|išeiti iš proto — сойти с ума|proto
w|rūpėti|verb||B1|волновать, заботить|9991340|Man nerūpi. — Меня это не волнует. (кому — дат. п.)|rūpi, rūpėjo
w|šiaip|adv||B1|вообще-то; так, просто|12869332|šiaip sau — так себе; šiaip ar taip — так или иначе|
w|paleisti|verb||B1|отпустить; запустить, включить|8133197||paleidžia, paleido
w|gyvybė|noun|f|B1|жизнь (живой организм)|11572656|ср. gyvenimas — жизнь (образ, время жизни); gelbėti gyvybę — спасать жизнь|gyvybės
w|tegul|part||B1|пусть|11584205|Tegul jis ateina. — Пусть он придёт.; = tegu|
w|įsivaizduoti|verb||B1|представить себе, вообразить|12953566||įsivaizduoja, įsivaizdavo
w|dėmesys|noun|m|B1|внимание|11715708|atkreipti dėmesį į… — обратить внимание на…|dėmesio
w|vien|part||B1|только, лишь|13736333|vien tik — только лишь|
w|sekti|verb||B1|следить; следовать (за кем)|11695022||seka, sekė
w|argi|part||B1|разве|12176649|Argi tu nežinai? — Разве ты не знаешь?|
w|smegenys|noun|f|B1|мозг|10346384|Только мн. ч.: smegenys, род. п. smegenų|smegenų
w|vertas|adj||B1|стоящий, достойный|13074401|vertas ko (+ род. п.): Tai verta pamatyti. — Это стоит увидеть.|
w|saugotis|verb||B1|беречься, остерегаться|9822743|saugotis ko (+ род. п.): Saugokis šuns! — Берегись собаки!|saugosi, saugojosi
w|priekis|noun|m|B1|перёд, передняя часть|12097321|priekyje — впереди|priekio
w|visuomet|adv||B1|всегда|13425361|= visada|
w|negyvas|adj||B1|мёртвый, неживой|1668080||
w|nebe|part||B1|больше не, уже не|3985899|пишется слитно с глаголом: nebegyvena — уже не живёт|
w|vidun|adv||B1|внутрь (куда?)|3948970|ср. viduje — внутри (где?)|
w|kova|noun|f|B1|борьба|8343948||kovos
w|tol|adv||B1|до тех пор|12869467|tol, kol… — до тех пор, пока…|
w|netyčia|adv||B1|нечаянно, случайно|13934930|ср. tyčia — нарочно|
w|dauguma|noun|f|B1|большинство|13265445|dauguma žmonių — большинство людей (+ род. п.)|daugumos
w|tučtuojau|adv||B1|немедленно|12785123||
w|daugelis|noun|m|B1|многие, множество|13531122|daugelis žmonių — многие люди (+ род. п.)|daugelio
w|šalin|adv||B1|прочь|11851495|Šalin! — Прочь!|
w|daugybė|noun|f|B1|множество|13360470|daugybė žmonių — множество людей (+ род. п.)|daugybės
w|itin|adv||B2|особенно, крайне|12126362|itin svarbu — крайне важно|
w|jog|conj||B1|что (союз)|2724985|= kad: Jis sakė, jog ateis. — Он сказал, что придёт.|
w|išties|adv||B1|действительно, в самом деле|11912363||
w|bei|conj||B1|и (книжн.)||= ir; часто в официальных текстах|
w|rūmai|noun|m|B1|дворец|13103134|Только мн. ч.: rūmai, род. п. rūmų; Valdovų rūmai — Дворец правителей|rūmų
w|šitaip|adv||B1|так, таким образом (разг.)|13351854|= taip|
w|patekti|verb||B1|попасть|12727684||patenka, pateko
w|kabinetas|noun|m|B1|кабинет|12684644||kabineto
w|išvis|adv||B1|вообще (разг.)|10711678|Aš išvis nežinau. — Я вообще не знаю.|
w|operacija|noun|f|B1|операция|13269039||operacijos
w|nejaugi|part||B1|неужели|11461549||
w|linija|noun|f|B1|линия|13764630||linijos
w|greičiausiai|adv||B1|скорее всего|12615038||
w|auka|noun|f|B2|жертва; пожертвование|13696555||aukos
w|forma|noun|f|B1|форма|2970557||formos
w|kitur|adv||B1|в другом месте|11057837||
w|dievinti|verb||B1|обожать|9181425||dievina, dievino
w|santykis|noun|m|B1|отношение|12647048|santykiai — отношения (между людьми)|santykio
w|bazė|noun|f|B1|база|||bazės
w|kristi|verb||B1|падать|12294078||krinta, krito
w|bjaurus|adj||B1|гадкий, противный|10239737||
w|patraukti|verb||B1|потянуть; привлечь; отодвинуть|10713621|patraukti pečiais — пожать плечами|patraukia, patraukė
w|zona|noun|f|B1|зона|9763584||zonos
w|derėti|verb||B2|подходить, идти (кому); следовало бы|12967284|derėtų + инф. — следовало бы: Tau derėtų pailsėti. — Тебе следовало бы отдохнуть.|dera, derėjo
w|rytojus|noun|m|B1|завтрашний день||rytojaus diena — завтрашний день|rytojaus
w|griebti|verb||B1|хватать, схватить|||griebia, griebė
w|pasidaryti|verb||B1|стать, сделаться; сделать себе|13186281|Pasidarė šalta. — Стало холодно.|pasidaro, pasidarė
w|mūšis|noun|m|B2|битва, сражение|12140014||mūšio
w|susirasti|verb||B1|найти (себе)|9002898|susirasti darbą — найти работу|susiranda, susirado
w|pasiruošti|verb||B1|приготовиться, подготовиться|2209951|= pasirengti; pasiruošti egzaminui — подготовиться к экзамену (дат. п.)|pasiruošia, pasiruošė
w|sykis|noun|m|B1|раз|14048716|= kartas: šį sykį — на этот раз|sykio
w|elektra|noun|f|B1|электричество|10250473||elektros
w|asmuo|noun|m|B1|лицо, личность, человек (офиц.)|11917479|род. п. asmens, мн. ч. asmenys|asmens
w|įsakymas|noun|m|B2|приказ|10490276||įsakymo
w|dvigubas|adj||B1|двойной|11586584||
w|atimti|verb||B1|отнять|12570849||atima, atėmė
w|mėginti|verb||B1|пытаться, пробовать|12319196|= bandyti|mėgina, mėgino
w|kontrolė|noun|f|B1|контроль|||kontrolės
w|antraip|adv||B2|иначе, в противном случае|||
w|tikėjimas|noun|m|B1|вера|13271763||tikėjimo
w|laukan|adv||B1|наружу, вон|13520693|Eik laukan! — Выйди вон!; ср. lauke — на улице|
w|prisiekti|verb||B1|поклясться|13878240||prisiekia, prisiekė
w|pavogti|verb||B1|украсть|12292999||pavagia, pavogė
w|armija|noun|f|B1|армия|12202086||armijos
w|tad|conj||B1|итак, значит, поэтому|3945136|= taigi|
w|pamėginti|verb||B1|попробовать|11852425|= pabandyti|pamėgina, pamėgino
"""
