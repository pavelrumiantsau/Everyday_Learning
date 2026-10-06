# Batch source for content/lt/vocab/b2-3375.yaml (B1–B2 words from frequency candidates `pnpm content:candidates lt 47000 6000`
# and the unused rest of `lt 41000` / `lt 35000`, reduced to lemmas; names, violence, slang and very technical words skipped).
# Checked against every `text:` in content/lt.
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["garstyčios", "karoliai", "konservai", "kursai", "lęšiai", "marškinėliai", "padariniai"]
ROWS = """
w|domėtis|verb||B1|интересоваться|9146961||domisi, domėjosi
w|pavyzdžiui|part||B1|например|11077921|Вводное слово, выделяется запятыми|
w|padariniai|noun|m|B1|последствия|13229989|Обычно во мн. ч.: padariniai, род. п. padarinių|padarinių
w|planuoti|verb||B1|планировать|13867187||planuoja, planavo
w|nepatogus|adj||B1|неудобный|4905287||
w|knygynas|noun|m|B1|книжный магазин|4796090||knygyno
w|dėstyti|verb||B1|преподавать; излагать|10680905|dėstyti universitete — преподавать в университете|dėsto, dėstė
w|neturtingas|adj||B1|бедный, небогатый|10709975||
w|kursai|noun|m|B1|курсы|13405494|Только мн. ч.: kursai, род. п. kursų; kalbos kursai — языковые курсы|kursų
w|pakenkti|verb||B1|навредить, повредить|12597263|+ дат. п.: pakenkti sveikatai — навредить здоровью|pakenkia, pakenkė
w|smarkus|adj||B1|сильный, бурный|8396806||
w|piniginė|noun|f|B1|кошелёк|10829212||piniginės
w|papildyti|verb||B1|дополнить; пополнить|10311558||papildo, papildė
w|suaugęs|adj||B1|взрослый|8861789|Ж. р. suaugusi; suaugusieji — взрослые (сущ.)|
w|neteisybė|noun|f|B1|несправедливость; неправда|13331354||neteisybės
w|peržiūrėti|verb||B1|просмотреть, пересмотреть|12868921||peržiūri, peržiūrėjo
w|svetingas|adj||B1|гостеприимный|3296623||
w|pasivaikščiojimas|noun|m|B1|прогулка|13524366||pasivaikščiojimo
w|pasiskųsti|verb||B1|пожаловаться|11547679|kam, dėl ko / kuo: pasiskųsti gydytojui galvos skausmu|pasiskundžia, pasiskundė
w|pagyvenęs|adj||B1|пожилой|14057367|Ж. р. pagyvenusi|
w|padėjėjas|noun|m|B1|помощник|11284796||padėjėjo
w|pasitaisyti|verb||B1|поправиться; исправиться|11931402||pasitaiso, pasitaisė
w|tiesus|adj||B1|прямой||tiesiai — прямо|
w|santrauka|noun|f|B2|краткое изложение, резюме|11597647||santraukos
w|užduoti|verb||B1|задать (вопрос, задание)|10749379|užduoti klausimą — задать вопрос|užduoda, uždavė
w|stambus|adj||B2|крупный; полный (о теле)|13612141||
w|egzempliorius|noun|m|B2|экземпляр|13168550||egzemplioriaus
w|užsikrėsti|verb||B1|заразиться|11163178|+ твор. п.: užsikrėsti gripu|užsikrečia, užsikrėtė
w|taikus|adj||B2|мирный|13311328||
w|eiga|noun|f|B2|ход (событий, процесса)|13227993|darbo eiga — ход работы|eigos
w|aprūpinti|verb||B2|обеспечить, снабдить|12195713|kuo (+ твор. п.): aprūpinti maistu|aprūpina, aprūpino
w|gretimas|adj||B2|соседний, смежный|11075158||
w|paveldas|noun|m|B2|наследие|12901357||paveldo
w|baimintis|verb||B2|опасаться|13640874|+ род. п.: baimintis pasekmių|baiminasi, baiminosi
w|nuspėjamas|adj||B2|предсказуемый|13516053||
w|privilegija|noun|f|B2|привилегия|11865958||privilegijos
w|branginti|verb||B2|дорожить, ценить|7787269||brangina, brangino
w|perkeltinis|adj||B2|переносный (о значении)|11787527|perkeltine prasme — в переносном смысле|
w|rašinys|noun|m|B1|сочинение (школьное)|13051649||rašinio
w|išdrįsti|verb||B1|осмелиться, решиться|6861429||išdrįsta, išdrįso
w|nerūpestingas|adj||B2|беззаботный; небрежный|10968846||
w|rašysena|noun|f|B1|почерк|3118393||rašysenos
w|globoti|verb||B2|опекать; ухаживать (за кем-л.)|12566015|+ вин. п.: globoti vaikus|globoja, globojo
w|netvarkingas|adj||B1|неаккуратный, неопрятный|11899859||
w|susirašinėjimas|noun|m|B2|переписка|13878333||susirašinėjimo
w|išgarsėti|verb||B2|прославиться|12466801|kuo (+ твор. п.)|išgarsėja, išgarsėjo
w|pajėgus|adj||B2|способный (сделать), в силах|12204948||
w|stebėtojas|noun|m|B2|наблюдатель|13290786||stebėtojo
w|ištesėti|verb||B2|сдержать (слово, обещание)|12902349|ištesėti pažadą — сдержать обещание|ištesi, ištesėjo
w|apgalvotas|adj||B2|продуманный, обдуманный|||
w|tikslumas|noun|m|B2|точность|12238762||tikslumo
w|iššvaistyti|verb||B2|растратить, промотать|11629944||iššvaisto, iššvaistė
w|emocinis|adj||B2|эмоциональный|13012424||
w|rinkėjas|noun|m|B2|избиратель||rinkėja — избирательница|rinkėjo
w|pareikalauti|verb||B2|потребовать|4851862|+ род. п.: pareikalauti paaiškinimo|pareikalauja, pareikalavo
w|klasikinis|adj||B1|классический|13850030||
w|redakcija|noun|f|B2|редакция|||redakcijos
w|perkalbėti|verb||B2|переубедить, уговорить|12732481||perkalba, perkalbėjo
w|centrinis|adj||B1|центральный|13716469||
w|leidėjas|noun|m|B2|издатель|10519966||leidėjo
w|patobulinti|verb||B2|усовершенствовать|13317528||patobulina, patobulino
w|idealus|adj||B1|идеальный|13599038||
w|biografija|noun|f|B1|биография|12323432||biografijos
w|pergyventi|verb||B2|пережить (испытать)|11202031|В значении «волноваться» — разговорное, лучше jaudintis|pergyvena, pergyveno
w|blaivus|adj||B2|трезвый|11915113||
w|motinystė|noun|f|B2|материнство|2624113||motinystės
w|pažeminti|verb||B2|унизить|13855902||pažemina, pažemino
w|doras|adj||B2|честный, порядочный|12773143||
w|didvyris|noun|m|B1|герой|13070225||didvyrio
w|kankintis|verb||B2|мучиться|11945139||kankinasi, kankinosi
w|uoliai|adv||B2|усердно, старательно|10602042||
w|entuziazmas|noun|m|B2|энтузиазм|13599803||entuziazmo
w|analizuoti|verb||B2|анализировать|13791768||analizuoja, analizavo
w|pakartotinai|adv||B2|повторно, неоднократно|12094502||
w|citata|noun|f|B2|цитата|13192755||citatos
w|susivienyti|verb||B2|объединиться|13434353||susivienija, susivienijo
w|nenoriai|adv||B1|неохотно|11466323||
w|pakaitalas|noun|m|B2|заменитель|13736324||pakaitalo
w|įrengti|verb||B2|оборудовать, обустроить|13940046||įrengia, įrengė
w|retsykiais|adv||B2|изредка|12289682||
w|užsiėmimas|noun|m|B2|занятие|9683190||užsiėmimo
w|įstengti|verb||B2|суметь, быть в силах|13717943||įstengia, įstengė
w|prastėti|verb||B2|ухудшаться|624631||prastėja, prastėjo
w|mat|part||B2|ведь, дело в том что (разг.)|11350533|kaip mat — мигом, вот-вот|
w|kartojimas|noun|m|B1|повторение|1803423||kartojimo
w|nekantrauti|verb||B2|ждать с нетерпением, не терпеться|9038512||nekantrauja, nekantravo
w|neteisingai|adv||B1|неправильно|12188341||
"""
