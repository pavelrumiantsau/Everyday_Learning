# Batch source for content/lt/vocab/b2-2183.yaml (B1→B2 topic gaps: society & politics, media, nature & environment,
# travel; a few lemmas from frequency ranks 35000–47000).
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT, PLAN "Inputs…" 3).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = []
ROWS = """
w|partija|noun|f|B1|партия|12331707|также партия в игре: sužaisti partiją|partijos
w|lygybė|noun|f|B2|равенство|13633247||lygybės
w|diskriminacija|noun|f|B2|дискриминация|13043679||diskriminacijos
w|transliuoti|verb||B2|транслировать|13539555|tiesioginė transliacija — прямая трансляция|transliuoja, transliavo
w|gerovė|noun|f|B2|благосостояние, благополучие|13085963||gerovės
w|korupcija|noun|f|B2|коррупция|8049432||korupcijos
w|kyšis|noun|m|B2|взятка|3954135|duoti / imti kyšį — давать / брать взятку|kyšio
w|socialinis|adj||B2|социальный|8353960|socialiniai tinklai — социальные сети|
w|protestas|noun|m|B2|протест|13091368||protesto
w|savanoris|noun|m|B1|доброволец, волонтёр|13856433||savanorio
w|labdara|noun|f|B2|благотворительность|||labdaros
w|teršti|verb||B2|загрязнять, засорять|13920157|užteršti — загрязнить|teršia, teršė
w|bendruomenė|noun|f|B2|сообщество, община|||bendruomenės
w|emigracija|noun|f|B2|эмиграция|11651605|emigrantas — эмигрант|emigracijos
w|imigrantas|noun|m|B2|иммигрант|12119858||imigranto
w|tautybė|noun|f|B1|национальность|13529034||tautybės
w|balsavimas|noun|m|B2|голосование|12792658|balsavimo teisė — право голоса|balsavimo
w|rūšiuoti|verb||B1|сортировать|10458204|rūšiuoti šiukšles — сортировать мусор|rūšiuoja, rūšiavo
w|referendumas|noun|m|B2|референдум|13808273||referendumo
w|opozicija|noun|f|B2|оппозиция|13859831||opozicijos
w|reforma|noun|f|B2|реформа|11583210||reformos
w|teismas|noun|m|B1|суд|13018598||teismo
w|nusikaltimas|noun|m|B1|преступление|12138180|padaryti nusikaltimą — совершить преступление|nusikaltimo
w|visuomeninis|adj||B2|общественный|2693407|
w|kariuomenė|noun|f|B1|армия, войско|12927190||kariuomenės
w|perdirbti|verb||B2|перерабатывать; переделать|12175718|perdirbimas — переработка|perdirba, perdirbo
w|gynyba|noun|f|B2|оборона, защита|10779758||gynybos
w|konstitucija|noun|f|B2|конституция|||konstitucijos
w|gimstamumas|noun|m|B2|рождаемость|||gimstamumo
w|žurnalistas|noun|m|B1|журналист|14030441||žurnalisto
w|interviu|noun|m|B1|интервью|12734724|не склоняется: duoti interviu — дать интервью|interviu
w|transliacija|noun|f|B2|трансляция|11489477||transliacijos
w|persėsti|verb||B1|пересесть|12578609|persėsti į kitą traukinį — пересесть на другой поезд|persėda, persėdo
w|žiūrovas|noun|m|B1|зритель|11690467||žiūrovo
w|klausytojas|noun|m|B2|слушатель|12717479||klausytojo
w|skaitytojas|noun|m|B1|читатель|12896393||skaitytojo
w|prenumerata|noun|f|B2|подписка|12867717||prenumeratos
w|dezinformacija|noun|f|B2|дезинформация|13105051||dezinformacijos
w|leidykla|noun|f|B2|издательство|10242040||leidyklos
w|rezervuoti|verb||B1|забронировать, зарезервировать|||rezervuoja, rezervavo
w|ekologiškas|adj||B2|экологичный, экологически чистый|10706354|
w|redaktorius|noun|m|B2|редактор|||redaktoriaus
w|įrašas|noun|m|B1|запись; пост (в соцсетях)|11597917|vaizdo įrašas — видеозапись|įrašo
w|cenzūra|noun|f|B2|цензура|||cenzūros
w|tarša|noun|f|B2|загрязнение (окружающей среды)|||taršos
w|gyvūnija|noun|f|B2|животный мир, фауна|13310512|augalija — растительный мир, флора|gyvūnijos
w|smerkti|verb||B2|осуждать|12855852|pasmerkti — осудить|smerkia, smerkė
w|sausra|noun|f|B2|засуха|13415439||sausros
w|audra|noun|f|B1|буря, гроза|3192559||audros
w|kalva|noun|f|B1|холм|9989855||kalvos
w|slėnis|noun|m|B1|долина|10272852||slėnio
w|pakrantė|noun|f|B1|побережье, берег|10170723||pakrantės
w|kopa|noun|f|B1|дюна|||kopos
w|paplisti|verb||B2|распространиться|10638745|paplitęs — распространённый|paplinta, paplito
w|rezervatas|noun|m|B2|заповедник|||rezervato
w|derlingas|adj||B2|плодородный|||
w|jėgainė|noun|f|B2|электростанция||vėjo / saulės jėgainė — ветряная / солнечная электростанция|jėgainės
w|gaisras|noun|m|B1|пожар|4620045|kilo gaisras — начался пожар|gaisro
w|šiltnamis|noun|m|B1|теплица|9945646||šiltnamio
w|atšilimas|noun|m|B2|потепление|13524850|klimato atšilimas — потепление климата|atšilimo
w|ledynas|noun|m|B2|ледник|||ledyno
w|kandidatuoti|verb||B2|баллотироваться|12916685|kandidatas — кандидат|kandidatuoja, kandidatavo
w|vandenynas|noun|m|B1|океан|12582378||vandenyno
w|dirva|noun|f|B2|почва|13244976|dirvožemis — почва (научн.)|dirvos
w|žemėlapis|noun|m|A2|карта (географическая)|8581450||žemėlapio
w|pasienis|noun|m|B2|приграничная зона, граница|13442485||pasienio
w|keltas|noun|m|B1|паром|12656522||kelto
w|pasisakyti|verb||B2|высказаться; выступить (за / против)|12896023|pasisakyti už ką / prieš ką|pasisako, pasisakė
w|uostas|noun|m|B1|порт|10954934|oro uostas — аэропорт|uosto
w|kurortas|noun|m|B1|курорт|9946537||kurorto
w|agentūra|noun|f|B1|агентство|10641418|kelionių agentūra — турагентство|agentūros
w|lankytinas|adj||B2|достойный посещения||lankytinos vietos — достопримечательности|
w|poilsiautojas|noun|m|B2|отдыхающий|13692467||poilsiautojo
w|stovykla|noun|f|B1|лагерь|13332564||stovyklos
w|vėlavimas|noun|m|B1|опоздание, задержка|3951630||vėlavimo
w|išrinkti|verb||B1|выбрать, избрать|12368641|išrinkti prezidentą — избрать президента|išrenka, išrinko
w|išvykimas|noun|m|B1|отъезд, отправление|3192569||išvykimo
w|atvykimas|noun|m|B1|приезд, прибытие|13806225||atvykimo
w|nakvynė|noun|f|B1|ночлег|||nakvynės
"""
