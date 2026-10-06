# Batch source for content/lt/vocab/a1-0000-core-3235.yaml (rest of the A1–A2 core: numbers 0–10, 11, 12, 20, 100, 1000,
# ordinals 1st–10th, days of the week, measures, time and place words: pradžia, pabaiga, vidurys, galas, kairė, dešinė).
# Checked against every `text:` in content/lt. Numerals use pos `num`; cardinal ones note gender forms and the case they take.
# Examples are pulled from Tatoeba by id (exact text + translation); an empty id = no good example (allowed for LT).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_ru, tatoeba_id, note_ru, forms (verbs: pres, past) / genitive (nouns)
PLURAL_ONLY = ["Kalėdos", "Velykos"]
ROWS = """
w|vienas|num||A1|один; один (без других)|10593771|Ж. р. viena; с существительным в ед. ч.: vienas euras, viena diena|
w|pirmadienis|noun|m|A1|понедельник|11456940|pirmadienį — в понедельник (вин. п.); pirmadieniais — по понедельникам|pirmadienio
w|pirmas|num||A1|первый|11451072|Ж. р. pirma; pirmą valandą — в час|
w|du|num||A1|два|12734692|Ж. р. dvi: dvi knygos; род. п. dviejų; существительное во мн. ч.: du vaikai|
w|antradienis|noun|m|A1|вторник|12348981||antradienio
w|antras|num||A1|второй|12727712|Ж. р. antra; antrą valandą — в два часа|
w|trys|num||A1|три|12155450|Одна форма для обоих родов; вин. п. tris, род. п. trijų: trys vaikai, tris dienas|
w|trečiadienis|noun|m|A1|среда|13772013||trečiadienio
w|trečias|num||A1|третий|12614961|Ж. р. trečia|
w|keturi|num||A1|четыре|13018130|Ж. р. keturios: keturios valandos; вин. п. keturis|
w|ketvirtas|num||A1|четвёртый|13694798|Ж. р. ketvirta|
w|penki|num||A1|пять|12118599|Ж. р. penkios; вин. п. penkis; man penki metai — мне пять лет|
w|penktadienis|noun|m|A1|пятница|12752867||penktadienio
w|penktas|num||A1|пятый|13694796|Ж. р. penkta|
w|šeši|num||A1|шесть|12118598|Ж. р. šešios; вин. п. šešis|
w|šeštadienis|noun|m|A1|суббота|10629443||šeštadienio
w|šeštas|num||A1|шестой|12092539|Ж. р. šešta|
w|septyni|num||A1|семь|10218652|Ж. р. septynios; вин. п. septynis|
w|sekmadienis|noun|m|A1|воскресенье|12327604||sekmadienio
w|septintas|num||A1|седьмой|4796106|Ж. р. septinta|
w|aštuoni|num||A1|восемь|12298854|Ж. р. aštuonios; вин. п. aštuonis|
w|pusvalandis|noun|m|A1|полчаса|12725192|po pusvalandžio — через полчаса|pusvalandžio
w|aštuntas|num||A1|восьмой|11008351|Ж. р. aštunta|
w|devyni|num||A1|девять|13764147|Ж. р. devynios; вин. п. devynis|
w|data|noun|f|A1|дата|12926827||datos
w|devintas|num||A1|девятый|10905541|Ж. р. devinta|
w|dešimt|num||A1|десять|12118594|Не склоняется; + род. п. мн. ч.: dešimt metų, dešimt eurų|
w|pradžia|noun|f|A1|начало|11490538|iš pradžių — сначала, вначале|pradžios
w|dešimtas|num||A1|десятый|12582186|Ж. р. dešimta|
w|vienuolika|num||A1|одиннадцать|13343941|11–19 оканчиваются на -lika (dvylika, trylika…) и требуют род. п. мн. ч.: vienuolika metų|
w|pabaiga|noun|f|A1|конец, окончание|13542751|metų pabaigoje — в конце года|pabaigos
w|dvylika|num||A1|двенадцать|2723769|+ род. п. мн. ч.: dvylika mėnesių|
w|vidurys|noun|m|A1|середина, центр|9630312|viduryje — посередине: kambario viduryje — посреди комнаты|vidurio
w|dvidešimt|num||A1|двадцать|12202271|+ род. п. мн. ч.: dvidešimt metų; но dvidešimt penki metai — согласуется последнее слово|
w|galas|noun|m|A1|конец (край, предел)|13208087|galų gale — в конце концов|galo
w|šimtas|num||A1|сто|13736063|Склоняется как сущ. м. р.: род. п. šimto, du šimtai; + род. п. мн. ч.: šimtas eurų|
w|kairė|noun|f|A1|левая сторона, лево|12294153|į kairę, kairėn — налево; kairėje — слева|kairės
w|tūkstantis|num||A1|тысяча|579269|Мужской род: род. п. tūkstančio, du tūkstančiai; + род. п. мн. ч.: tūkstantis eurų|
w|dešinė|noun|f|A1|правая сторона, право|8208137|į dešinę, dešinėn — направо; dešinėje — справа|dešinės
w|metras|noun|m|A1|метр|13352374||metro
w|kilometras|noun|m|A1|километр|12939947||kilometro
w|kilogramas|noun|m|A1|килограмм|13310516||kilogramo
w|Kalėdos|noun|f|A1|Рождество|4737989|Только мн. ч.: Kalėdos, род. п. Kalėdų; per Kalėdas — на Рождество; Kūčios — сочельник|Kalėdų
w|Velykos|noun|f|A1|Пасха|12797949|Только мн. ч.: Velykos, род. п. Velykų|Velykų
w|gimtadienis|noun|m|A1|день рождения|12289525|Su gimtadieniu! — С днём рождения!|gimtadienio
"""
