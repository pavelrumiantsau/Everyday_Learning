# Batch source for content/lt/vocab/b2-3877.yaml (B1–B2 words: lemmas from the glossaries of content/lt/reading/*.yaml
# that were not vocabulary items yet — prefixed and reflexive verbs, abstract nouns of essays and news — plus the fallback
# lemmas left from the 2026-10-06 session: vėliava, komedija, mitas, jubiliejus, lęšiai, žirniai, plunksna, viela, vilna,
# katalogas, galvosūkis). Names, violence, slang and very technical words skipped. Checked against every `text:` in
# content/lt. Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example.
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["garai", "trąšos", "lęšiai", "žirniai"]
ROWS = """
w|apsiriboti|verb||B2|ограничиться||+ твор. п.: apsiriboti keliais žodžiais — ограничиться парой слов|apsiriboja, apsiribojo
w|simpatija|noun|f|B2|симпатия|13035051||simpatijos
w|vilnonis|adj||B1|шерстяной|10546244||
w|emigruoti|verb||B1|эмигрировать|11588115||emigruoja, emigravo
w|įkūrėjas|noun|m|B2|основатель|||įkūrėjo
w|šventinis|adj||B1|праздничный|12797960||
w|išalkti|verb||B1|проголодаться|12312599||išalksta, išalko
w|obelis|noun|f|B1|яблоня|10830273|Ж. р.: obelis, род. п. obels|obels
w|faktinis|adj||B2|фактический|||
w|išsiversti|verb||B2|обойтись|9054174|išsiversti be ko — обойтись без чего|išsiverčia, išsivertė
w|partnerystė|noun|f|B2|партнёрство|||partnerystės
w|dryžuotas|adj||B1|полосатый|||
w|nuomoti|verb||B1|сдавать в аренду, внаём|||nuomoja, nuomojo
w|tešla|noun|f|B1|тесто|3088409||tešlos
w|saikingai|adv||B2|умеренно|||
w|nuomotis|verb||B1|снимать, арендовать|13209269|nuomotis butą — снимать квартиру|nuomojasi, nuomojosi
w|vidurkis|noun|m|B2|среднее (значение); средний балл|||vidurkio
w|vienur|adv||B2|в одном месте|13890821|vienur kitur — кое-где; vienur…, kitur… — в одном месте…, в другом…|
w|nutolti|verb||B2|отдалиться|||nutolsta, nutolo
w|visuma|noun|f|B2|совокупность, целое|||visumos
w|bene|part||B2|пожалуй, едва ли не||bene geriausias — едва ли не лучший|
w|pakisti|verb||B2|измениться|12289505||pakinta, pakito
w|ugniagesys|noun|m|B1|пожарный|12615027||ugniagesio
w|vilna|noun|f|B1|шерсть|4615252||vilnos
w|papuošti|verb||B1|украсить|12352291||papuošia, papuošė
w|garai|noun|m|B1|пар||Обычно мн. ч.: garai, род. п. garų|garų
w|katalogas|noun|m|B1|каталог|12852868||katalogo
w|pasikonsultuoti|verb||B2|проконсультироваться|13076351|pasikonsultuoti su kuo — проконсультироваться с кем|pasikonsultuoja, pasikonsultavo
w|patikra|noun|f|B2|проверка, осмотр||sveikatos patikra — медосмотр|patikros
w|galvosūkis|noun|m|B1|головоломка|12924750||galvosūkio
w|plėtoti|verb||B2|развивать|13054623|plėtotis — развиваться|plėtoja, plėtojo
w|kirtis|noun|m|B2|ударение (в слове); удар|13788169||kirčio
w|priskirti|verb||B2|отнести (к чему-л.), причислить; приписать|12585537|priskirti prie ko — относить к чему|priskiria, priskyrė
w|trąšos|noun|f|B2|удобрения||Только мн. ч.: trąšos, род. п. trąšų|trąšų
w|skiepytis|verb||B1|прививаться, делать прививку|||skiepijasi, skiepijosi
w|elektrinė|noun|f|B2|электростанция|12201815||elektrinės
w|suformuluoti|verb||B2|сформулировать|||suformuluoja, suformulavo
w|perteklius|noun|m|B2|избыток, излишек|||pertekliaus
w|sunaudoti|verb||B2|израсходовать, потратить|10661196||sunaudoja, sunaudojo
w|rašyba|noun|f|B1|правописание, орфография|13079079||rašybos
w|užšalti|verb||B1|замёрзнуть (о воде), покрыться льдом|13704765||užšąla, užšalo
w|savanorystė|noun|f|B2|волонтёрство|||savanorystės
w|įsteigti|verb||B2|учредить, основать|12731732||įsteigia, įsteigė
w|atotrūkis|noun|m|B2|разрыв, отрыв (между чем-л.)|||atotrūkio
w|nykti|verb||B2|исчезать, вымирать|11161448||nyksta, nyko
w|atsparumas|noun|m|B2|устойчивость, сопротивляемость|||atsparumo
w|jungtis|verb||B2|присоединяться; подключаться||jungtis prie ko — присоединяться к чему|jungiasi, jungėsi
w|kempinė|noun|f|B1|губка|||kempinės
w|prigyti|verb||B2|прижиться|||prigyja, prigijo
w|nepasitikėjimas|noun|m|B2|недоверие|13538138||nepasitikėjimo
w|puoselėti|verb||B2|лелеять, беречь; развивать (традиции)|12892788||puoselėja, puoselėjo
w|nuostata|noun|f|B2|установка, убеждение; положение (закона)|||nuostatos
w|stokoti|verb||B2|испытывать нехватку, не хватать|11594977|+ род. п.: stokoti patirties — не хватать опыта|stokoja, stokojo
w|paskata|noun|f|B2|стимул, поощрение|||paskatos
w|įsigilinti|verb||B2|вникнуть, углубиться||įsigilinti į ką — вникнуть во что|įsigilina, įsigilino
w|pasaulėžiūra|noun|f|B2|мировоззрение|||pasaulėžiūros
w|toleruoti|verb||B2|терпеть, мириться|10694731||toleruoja, toleravo
w|patogumas|noun|m|B1|удобство|13597117|visi patogumai — все удобства|patogumo
w|užleisti|verb||B1|уступить|12926344|užleisti vietą — уступить место|užleidžia, užleido
w|pavėsis|noun|m|B1|тень (укрытие от солнца)|11954987|pavėsyje — в тени; ср. šešėlis — тень (отбрасываемая)|pavėsio
w|matuoti|verb||B1|измерять|11993235|matuotis — примерять (одежду)|matuoja, matavo
w|priekaištas|noun|m|B2|упрёк|10820299||priekaišto
w|rodiklis|noun|m|B2|показатель|13747335||rodiklio
w|savivertė|noun|f|B2|самооценка|||savivertės
w|spraga|noun|f|B2|пробел, брешь|||spragos
w|veiksnys|noun|m|B2|фактор|12726282||veiksnio
w|vėliava|noun|f|B1|флаг|11595619||vėliavos
w|komedija|noun|f|B1|комедия|11993387||komedijos
w|mitas|noun|m|B1|миф|13054439||mito
w|jubiliejus|noun|m|B1|юбилей|12527432||jubiliejaus
w|lęšiai|noun|m|B1|чечевица|13329028|Обычно мн. ч.: lęšiai, род. п. lęšių (lęšis — также линза)|lęšių
w|žirniai|noun|m|B1|горох||Обычно мн. ч.: žirniai, род. п. žirnių (žirnis — горошина)|žirnių
w|plunksna|noun|f|B1|перо (птичье)|13091320||plunksnos
w|viela|noun|f|B1|проволока|13529081||vielos
"""
