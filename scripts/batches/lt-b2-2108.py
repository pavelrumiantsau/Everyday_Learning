# Batch source for content/lt/vocab/b2-2108.yaml (B1→B2 topic gaps: work & office, money, administration; a few lemmas
# from frequency ranks 35000–47000).
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT, PLAN "Inputs…" 3).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["viršvalandžiai", "pareigos", "palūkanos", "santaupos", "sąnaudos"]
ROWS = """
w|darbdavys|noun|m|B1|работодатель|3692193||darbdavio
w|apmokėti|verb||B1|оплатить|13044028||apmoka, apmokėjo
w|etatas|noun|m|B2|ставка, штатная должность||dirbti visu etatu / puse etato — работать на полную ставку / на полставки|etato
w|viršvalandžiai|noun|m|B2|сверхурочные (часы)|9845053|dirbti viršvalandžius — работать сверхурочно|viršvalandžių
w|pareigos|noun|f|B1|должность; обязанности|13008441|eiti pareigas — занимать должность; ср. pareiga — долг|pareigų
w|finansinis|adj||B2|финансовый|11417649|
w|pabrangti|verb||B1|подорожать|13903373||pabrangsta, pabrango
w|kvalifikacija|noun|f|B2|квалификация|13641256||kvalifikacijos
w|profsąjunga|noun|f|B2|профсоюз|||profsąjungos
w|nedarbas|noun|m|B2|безработица|13709169|nedarbo lygis — уровень безработицы|nedarbo
w|atpigti|verb||B1|подешеветь|11524019||atpinga, atpigo
w|pašalpa|noun|f|B2|пособие|12450684|bedarbio pašalpa — пособие по безработице|pašalpos
w|biuras|noun|m|A2|офис, бюро|11938397||biuro
w|darbovietė|noun|f|B1|место работы|11627116||darbovietės
w|sukaupti|verb||B2|накопить|12868899||sukaupia, sukaupė
w|komandiruotė|noun|f|B1|командировка|9614858|išvykti į komandiruotę — уехать в командировку|komandiruotės
w|pasiturintis|adj||B2|зажиточный, состоятельный|11515550|
w|vadovybė|noun|f|B2|руководство|11595961||vadovybės
w|pavaduotojas|noun|m|B2|заместитель|||pavaduotojo
w|eikvoti|verb||B2|расходовать, тратить (зря)|12712237||eikvoja, eikvojo
w|buhalteris|noun|m|B1|бухгалтер|12722902||buhalterio
w|našumas|noun|m|B2|производительность|13810401|darbo našumas — производительность труда|našumo
w|derėtis|verb||B2|торговаться; вести переговоры|11684756|derybos — переговоры|derasi, derėjosi
w|užimtumas|noun|m|B2|занятость|12198427||užimtumo
w|konkurentas|noun|m|B2|конкурент|14001023||konkurento
w|užsakovas|noun|m|B2|заказчик|10919468||užsakovo
w|prabangus|adj||B2|роскошный|10745712|prabangiai — роскошно, в роскоши|
w|verstis|verb||B2|зарабатывать на жизнь (чем-л.), заниматься (чем-л.)|10774624|kuo verčiatės? — чем вы занимаетесь?|verčiasi, vertėsi
w|pusmetis|noun|m|B2|полугодие|12137130||pusmečio
w|pasitarimas|noun|m|B1|совещание|12957788||pasitarimo
w|palūkanos|noun|f|B2|проценты (по кредиту, вкладу)|13750543||palūkanų
w|pragyventi|verb||B2|прожить; прокормиться|10142032|pragyvenimas — средства к существованию|pragyvena, pragyveno
w|nuolaida|noun|f|B1|скидка; уступка|2724949||nuolaidos
w|santaupos|noun|f|B2|сбережения|13031771||santaupų
w|kvitas|noun|m|B1|квитанция, чек|12085944||kvito
w|aptarnauti|verb||B1|обслуживать|11666348||aptarnauja, aptarnavo
w|čekis|noun|m|B1|чек|13648584||čekio
w|turtingas|adj||A2|богатый|12368854|
w|infliacija|noun|f|B2|инфляция|10716785||infliacijos
w|atstovauti|verb||B2|представлять (кого-что)|13221596|atstovauti kam (дат. п.)|atstovauja, atstovavo
w|kreditas|noun|m|B1|кредит|10892928||kredito
w|turtas|noun|m|B1|имущество; богатство, состояние|13800206|nekilnojamasis turtas — недвижимость|turto
w|skurdas|noun|m|B2|бедность, нищета|13163883||skurdo
w|konkuruoti|verb||B2|конкурировать, соперничать|13555883|konkuruoti su kuo|konkuruoja, konkuravo
w|sąnaudos|noun|f|B2|затраты, издержки|12725838||sąnaudų
w|valiuta|noun|f|B2|валюта|12774137||valiutos
w|keitykla|noun|f|B2|обменный пункт|13870772|valiutos keitykla — пункт обмена валюты|keityklos
w|remti|verb||B2|поддерживать|12896032|parama — поддержка|remia, rėmė
w|nuotolinis|adj||B2|удалённый, дистанционный||nuotolinis darbas — удалённая работа|
w|pirkinys|noun|m|B1|покупка|13487971|pirkinių sąrašas — список покупок|pirkinio
w|gaminys|noun|m|B2|изделие, продукт|13352096||gaminio
w|bankomatas|noun|m|A2|банкомат|13006090||bankomato
w|išsaugoti|verb||B1|сохранить|13357102||išsaugo, išsaugojo
w|parašas|noun|m|B1|подпись|8925913|padėti parašą — поставить подпись|parašo
w|antspaudas|noun|m|B2|печать, штамп|10905657||antspaudo
w|pasas|noun|m|A2|паспорт|9609848||paso
w|patikslinti|verb||B2|уточнить|8946087||patikslina, patikslino
w|pilietybė|noun|f|B2|гражданство|13725756||pilietybės
w|atsarginis|adj||B1|запасной|10724334|
w|savivaldybė|noun|f|B2|самоуправление, муниципалитет|13296677||savivaldybės
w|užsitarnauti|verb||B2|заслужить|13196884||užsitarnauja, užsitarnavo
w|seniūnija|noun|f|B2|староство (мелкая административная единица в Литве)|||seniūnijos
w|pareiškimas|noun|m|B2|заявление|12894417||pareiškimo
w|įgaliojimas|noun|m|B2|доверенность; полномочие|13770059||įgaliojimo
w|pelnyti|verb||B2|заслужить, завоевать (доверие, награду)|13384552|pelnyti pasitikėjimą — завоевать доверие; pelnas — прибыль|pelno, pelnė
w|valdininkas|noun|m|B2|чиновник|13732988||valdininko
w|ministerija|noun|f|B2|министерство|10546421||ministerijos
w|pažyma|noun|f|B2|справка|||pažymos
w|įdarbinti|verb||B2|трудоустроить, принять на работу|||įdarbina, įdarbino
w|valstybinis|adj||B1|государственный|10284877|
w|notaras|noun|m|B2|нотариус|||notaro
w|kopija|noun|f|B1|копия|12442135||kopijos
w|galiojimas|noun|m|B2|действие, действительность (документа)|13322986|galiojimo laikas — срок действия / годности|galiojimo
w|deklaruoti|verb||B2|декларировать; регистрировать (место жительства)||deklaruoti gyvenamąją vietą — задекларировать место жительства|deklaruoja, deklaravo
w|kreipimasis|noun|m|B2|обращение|13097205||kreipimosi
"""
