# Batch source for content/fr/vocab/a1-0001.yaml — French A1 core (frequency ranks 1–1200 + days and basics the subtitle
# list ranks low). Notes in English; "ES:" notes compare with Spanish. French starts in April 2027 (new_per_day.fr = 0 until then).
# Columns: kind(w/p), text, pos, gender, cefr, meaning_en, tatoeba_id, note_en
ROWS = """
w|je|pron||A1|I|4579521|j' before a vowel: j'ai, j'aime
w|être|verb||A1|to be|7204851|je suis, tu es, il est, nous sommes, vous êtes, ils sont; ES has two verbs (ser/estar), FR one
w|avoir|verb||A1|to have|2792451|j'ai, tu as, il a, nous avons, vous avez, ils ont; j'ai faim = I'm hungry
w|tu|pron||A1|you (informal, one person)|1159122|
w|il|pron||A1|he; it|5240630|il est tard = it's late (impersonal "it")
w|elle|pron||A1|she; it|2190155|
w|nous|pron||A1|we; us|2190378|
w|vous|pron||A1|you (formal, or more than one)|8973|like ES usted + vosotros in one word
w|ils|pron||A1|they|1997556|elles = they (all female); sounds like il
w|on|pron||A1|we (informal); one, people|8690469|on y va = let's go; takes the il verb form
w|moi|pron||A1|me|433586|moi aussi = me too; stressed form of je
w|toi|pron||A1|you (stressed form)|524693|et toi ? = and you?
w|lui|pron||A1|him; (to) him/her|2057367|c'est lui = it's him
p|bonjour|phrase||A1|hello, good morning/afternoon|433728|
p|bonsoir|phrase||A1|good evening|582788|
p|salut|phrase||A1|hi; bye (informal)|330354|
p|merci|phrase||A1|thank you|5761414|merci beaucoup = thank you very much
p|pardon|phrase||A1|sorry; excuse me|4708684|
w|désolé|adj||A1|sorry|3689041|je suis désolé(e) = I'm sorry
p|bienvenue|phrase||A1|welcome|13026362|
w|oui|adv||A1|yes|3646768|after a negative question: si
w|non|adv||A1|no|8984209|
w|aller|verb||A1|to go|378541|je vais, tu vas, il va, nous allons, vous allez, ils vont
w|faire|verb||A1|to do, to make|4069639|je fais, nous faisons, vous faites, ils font; il fait froid = it's cold
w|dire|verb||A1|to say, to tell|1927907|je dis, vous dites; dis-moi = tell me
w|pouvoir|verb||A1|can, to be able to|4684101|je peux, nous pouvons, ils peuvent
w|vouloir|verb||A1|to want|4779612|je veux, nous voulons, ils veulent; je voudrais = I'd like
w|savoir|verb||A1|to know (facts, how to)|7555304|je sais; to know a person = connaître
w|voir|verb||A1|to see|135494|je vois, nous voyons
w|venir|verb||A1|to come|15362|je viens, nous venons, ils viennent
w|devoir|verb||A1|must, to have to|1996330|je dois, nous devons, ils doivent; also a noun: homework
w|prendre|verb||A1|to take|13151700|je prends, nous prenons, ils prennent
w|parler|verb||A1|to speak, to talk|14512|regular -er verb: je parle, nous parlons
w|aimer|verb||A1|to love; to like|5897191|j'aime le café = I like coffee
w|qui|pron||A1|who|4366797|c'est qui ? = who's that?
w|quoi|pron||A1|what|338276|informal / after prepositions: de quoi ?
w|où|adv||A1|where|10921245|d'où ? = from where?; ou (no accent) = or
w|quand|adv||A1|when|139596|
w|comment|adv||A1|how|4189529|comment ça va ? = how are you?
w|pourquoi|adv||A1|why|1039348|the answer: parce que = because
w|combien|adv||A1|how much, how many|5281900|c'est combien ? = how much is it?
w|quel|adj||A1|which, what|474069|quelle (f); quelle heure est-il ? = what time is it?
w|et|conj||A1|and|1311083|the t is silent
w|mais|conj||A1|but|11969354|
w|ou|conj||A1|or|1080207|où (accent) = where
w|si|conj||A1|if; so|621385|s' before il: s'il te plaît
p|parce que|phrase||A1|because|2021712|
w|avec|prep||A1|with|6468604|
w|sans|prep||A1|without|12914571|
w|pour|prep||A1|for; in order to|4594043|
w|dans|prep||A1|in, inside|10925453|
w|sur|prep||A1|on|11250968|
w|sous|prep||A1|under|14045095|
w|chez|prep||A1|at (someone's place)|10629497|chez moi = at my place, home; ES: en casa de
w|entre|prep||A1|between; among|7697735|entre nous = between us
w|avant|prep||A1|before|391432|avant de + inf.: avant de partir
w|après|prep||A1|after|7949|
w|depuis|prep||A1|since; for (time up to now)|890853|il pleut depuis hier = it's been raining since yesterday (present tense!)
w|pendant|prep||A1|during; for (a period)|7518|
w|vers|prep||A1|towards; around (time)|2842123|vers huit heures = around eight
w|très|adv||A1|very|6991|
w|trop|adv||A1|too; too much|6463412|
w|bien|adv||A1|well; fine|488439|je vais bien = I'm fine; très bien = very good
w|mal|adv||A1|badly; (avoir mal) to hurt|1073957|pas mal = not bad
w|aussi|adv||A1|also, too|536230|moi aussi = me too
w|ici|adv||A1|here|4579491|
w|là|adv||A1|there; here|2784386|là-bas = over there
w|peu|adv||A1|little, not much|7694625|un peu = a bit
w|beaucoup|adv||A1|a lot, much, many|1097853|beaucoup de + noun (no article): beaucoup de temps
w|plus|adv||A1|more|6576615|ne … plus = not any more
w|moins|adv||A1|less|5318757|au moins = at least
w|assez|adv||A1|enough; quite|3653010|
w|tout|pron||A1|everything, all|12299|c'est tout = that's all; tous, toute, toutes
w|rien|pron||A1|nothing|12338007|de rien = you're welcome; ne … rien = nothing
w|quelqu'un|pron||A1|someone|126571|il y a quelqu'un ? = is anyone there?
w|chaque|adj||A1|each, every|3671099|never changes
w|autre|adj||A1|other|407087|quoi d'autre ? = what else?
w|seul|adj||A1|alone; only|405491|
w|toujours|adv||A1|always; still|4852631|je t'aime toujours = I still love you
w|jamais|adv||A1|never; ever|3252555|ne … jamais = never
w|déjà|adv||A1|already|1531818|
w|encore|adv||A1|again; still; more|522401|encore une fois = once again
w|maintenant|adv||A1|now|6468589|
w|aujourd'hui|adv||A1|today|1848533|
w|demain|adv||A1|tomorrow|1254548|à demain = see you tomorrow
w|hier|adv||A1|yesterday|1343566|
w|un|num||A1|one; a, an|2792451|une (f); un chat = a cat
w|deux|num||A1|two|1664096|
w|trois|num||A1|three|621390|
w|quatre|num||A1|four|3272695|
w|cinq|num||A1|five|4475506|
w|six|num||A1|six|8030896|
w|sept|num||A1|seven|8030897|the p is silent
w|huit|num||A1|eight|130651|
w|neuf|num||A1|nine; new|7851089|also an adjective: new (quoi de neuf ? = what's new?)
w|dix|num||A1|ten|428446|
w|vingt|num||A1|twenty|4479452|
w|cent|num||A1|hundred|1624938|
w|mille|num||A1|thousand|6780343|merci mille fois = thanks a million; never takes -s
w|premier|adj||A1|first|477562|première (f)
w|lundi|noun|m|A1|Monday|7290550|days are masculine and lowercase; lundi = on Monday
w|mardi|noun|m|A1|Tuesday|12617397|
w|mercredi|noun|m|A1|Wednesday|2190214|
w|jeudi|noun|m|A1|Thursday|1153593|le jeudi = on Thursdays
w|vendredi|noun|m|A1|Friday|8823541|
w|samedi|noun|m|A1|Saturday|4320560|
w|dimanche|noun|m|A1|Sunday|1316367|
w|temps|noun|m|A1|time; weather|1302575|quel temps fait-il ? = what's the weather like?
w|jour|noun|m|A1|day|6380921|
w|nuit|noun|f|A1|night|1936247|bonne nuit = good night
w|soir|noun|m|A1|evening|5155946|ce soir = tonight
w|matin|noun|m|A1|morning|4197217|ce matin = this morning
w|semaine|noun|f|A1|week|5698060|
w|mois|noun|m|A1|month|11243161|
w|année|noun|f|A1|year|7610137|bonne année = happy New Year; an for counting: il a vingt ans
w|an|noun|m|A1|year|4479452|with numbers: vingt ans = twenty years (old); ES: tener 20 años = FR avoir 20 ans
w|heure|noun|f|A1|hour; time (o'clock)|3474|quelle heure est-il ? = what time is it?
w|minute|noun|f|A1|minute|427613|
w|moment|noun|m|A1|moment|4625939|
w|journée|noun|f|A1|day (the whole day)|6465455|bonne journée = have a nice day
w|fois|noun|f|A1|time (occasion)|1078187|une fois = once, deux fois = twice
w|homme|noun|m|A1|man|1409556|
w|femme|noun|f|A1|woman; wife|1328989|the e sounds like a: [fam]
w|enfant|noun|mf|A1|child|2269504|un / une enfant
w|fille|noun|f|A1|girl; daughter|14716|
w|fils|noun|m|A1|son|6690725|pronounced [fis]
w|garçon|noun|m|A1|boy|7482685|
w|père|noun|m|A1|father|7106538|papa = dad
w|mère|noun|f|A1|mother|544849|maman = mum
w|frère|noun|m|A1|brother|6600|
w|sœur|noun|f|A1|sister|1447098|
w|mari|noun|m|A1|husband|13260807|
w|famille|noun|f|A1|family|7920|
w|parents|noun|m|A1|parents; relatives|11202622|
w|ami|noun|m|A1|friend|551908|amie (f) sounds the same
w|gens|noun|m|A1|people|1628679|always plural: les gens
w|bébé|noun|m|A1|baby|1314685|always masculine, also for girls
w|oncle|noun|m|A1|uncle|458224|tante = aunt
w|monsieur|noun|m|A1|Mr; sir; gentleman|11247356|pronounced [məsjø]; messieurs (pl)
w|madame|noun|f|A1|Mrs; madam|877074|
w|médecin|noun|m|A1|doctor|342052|il/elle est médecin (no article)
w|professeur|noun|m|A1|teacher|968522|informal: le/la prof
w|chef|noun|m|A2|boss; chef|2228993|
w|maison|noun|f|A1|house, home|1122249|à la maison = at home
w|ville|noun|f|A1|town, city|9726|en ville = in town
w|pays|noun|m|A1|country|3362437|
w|rue|noun|f|A1|street|7007325|
w|route|noun|f|A1|road|13391022|en route = on the way
w|voiture|noun|f|A1|car|6400|
w|train|noun|m|A1|train|607731|en train = by train
w|avion|noun|m|A1|plane|5651477|en avion = by plane
w|bateau|noun|m|A1|boat|8434308|
w|école|noun|f|A1|school|470434|
w|bureau|noun|m|A1|office; desk|1706743|
w|chambre|noun|f|A1|bedroom; room|1272734|
w|cuisine|noun|f|A1|kitchen; cooking|7028885|faire la cuisine = to cook
w|table|noun|f|A1|table|2808138|mettre la table = to set the table
w|porte|noun|f|A1|door|1216901|
w|lit|noun|m|A1|bed|3640836|also: il lit = he reads
w|eau|noun|f|A1|water|3657876|l'eau (f)
w|café|noun|m|A1|coffee; café|7938644|du café = some coffee
w|vin|noun|m|A1|wine|1847399|
w|bière|noun|f|A1|beer|2488223|
w|argent|noun|m|A1|money; silver|13941214|
w|travail|noun|m|A1|work, job|549562|plural travaux
w|téléphone|noun|m|A1|phone|7499514|
w|livre|noun|m|A1|book|519545|une livre (f) = a pound
w|lettre|noun|f|A1|letter|7367444|
w|photo|noun|f|A1|photo|3742021|
w|film|noun|m|A1|film|2946509|
w|musique|noun|f|A1|music|2318391|
w|jeu|noun|m|A1|game|2129265|plural jeux
w|fête|noun|f|A1|party; holiday|10505413|
w|anniversaire|noun|m|A1|birthday|8648902|bon anniversaire = happy birthday
w|cadeau|noun|m|A1|present, gift|7876070|plural cadeaux
w|hôpital|noun|m|A1|hospital|1781895|
w|hôtel|noun|m|A1|hotel|12203016|
w|marché|noun|m|A1|market|5241655|
w|banque|noun|f|A1|bank|504871|
w|main|noun|f|A1|hand|6617629|feminine: la main (ES la mano too)
w|tête|noun|f|A1|head|129589|j'ai mal à la tête = I have a headache
w|œil|noun|m|A1|eye|9745803|plural: les yeux
w|cœur|noun|m|A1|heart|139385|par cœur = by heart
w|bouche|noun|f|A1|mouth|542947|
w|nez|noun|m|A1|nose|588673|
w|pied|noun|m|A1|foot|1578185|à pied = on foot
w|bras|noun|m|A1|arm|835565|
w|cheveux|noun|m|A1|hair|1998795|plural: les cheveux; un cheveu = a single hair
w|visage|noun|m|A1|face|579753|
w|dos|noun|m|A1|back|881872|j'ai mal au dos = my back hurts
w|nom|noun|m|A1|name; noun|8442833|
w|idée|noun|f|A1|idea|7916|
w|question|noun|f|A1|question|182757|
w|problème|noun|m|A1|problem|481798|pas de problème = no problem
w|histoire|noun|f|A1|story; history|7528066|
w|vérité|noun|f|A1|truth|5017571|
w|chose|noun|f|A1|thing|10015072|quelque chose = something
w|monde|noun|m|A1|world|5777999|tout le monde = everybody
w|vie|noun|f|A1|life|486231|
w|amour|noun|m|A1|love|4548333|
w|peur|noun|f|A1|fear|2069875|avoir peur = to be afraid (ES: tener miedo)
w|chance|noun|f|A1|luck; chance|966399|bonne chance = good luck
w|envie|noun|f|A2|wish, desire|8386414|avoir envie de = to feel like
w|besoin|noun|m|A1|need|2482624|avoir besoin de = to need
w|raison|noun|f|A1|reason|2071288|avoir raison = to be right (ES: tener razón)
w|faim|noun|f|A1|hunger|10146|avoir faim = to be hungry (ES: tener hambre)
w|froid|adj||A1|cold|3635|il fait froid = it's cold; j'ai froid = I'm cold
w|chaud|adj||A1|hot, warm|3701108|il fait chaud = it's hot
w|soleil|noun|m|A1|sun|614779|
w|ciel|noun|m|A1|sky|3213880|
w|terre|noun|f|A1|earth; ground|13620619|par terre = on the floor
w|mer|noun|f|A1|sea|5961086|
w|feu|noun|m|A1|fire; traffic light|960072|tu as du feu ? = have you got a light?
w|lumière|noun|f|A1|light|352835|
w|chien|noun|m|A1|dog|6567|
w|rouge|adj||A1|red|8701649|
w|noir|adj||A1|black|12635459|
w|blanc|adj||A1|white|4244618|blanche (f)
w|bon|adj||A1|good|1067016|bonne (f); ça a bon goût = it tastes good
w|mauvais|adj||A1|bad|1112219|
w|grand|adj||A1|big; tall|522380|usually before the noun: un grand homme
w|petit|adj||A1|small; short|2156361|
w|beau|adj||A1|beautiful, handsome|2231248|belle (f); bel before a vowel: un bel homme
w|joli|adj||A1|pretty|5411113|
w|jeune|adj||A1|young|2814406|
w|vieux|adj||A1|old|1924562|vieille (f); vieil before a vowel
w|nouveau|adj||A1|new|429827|nouvelle (f); nouvel before a vowel
w|long|adj||A1|long|429117|longue (f)
w|gros|adj||A1|big; fat|1476618|grosse (f)
w|vrai|adj||A1|true; real|4864878|
w|faux|adj||A1|false, wrong; fake|4864881|fausse (f)
w|sûr|adj||A1|sure|530212|bien sûr = of course
w|prêt|adj||A1|ready|6705|prête (f)
w|heureux|adj||A1|happy|4162854|heureuse (f)
w|triste|adj||A1|sad|1958821|
w|malade|adj||A1|ill, sick|133247|
w|content|adj||A1|glad, pleased|1159420|
w|gentil|adj||A1|kind, nice|1291411|gentille (f)
w|sympa|adj||A1|nice, friendly (informal)|753474|short for sympathique
w|facile|adj||A1|easy|1283993|
w|difficile|adj||A1|difficult|869099|
w|important|adj||A1|important|2397216|
w|possible|adj||A1|possible|2397230|
w|impossible|adj||A1|impossible|561390|
w|meilleur|adj||A2|better; (le meilleur) the best|4547305|
w|dernier|adj||A1|last|7763301|dernière (f)
w|libre|adj||A1|free|6725|free of charge = gratuit
w|cher|adj||A1|expensive; dear|4548407|c'est trop cher = it's too expensive
w|propre|adj||A2|clean; own|4547433|ma propre voiture = my own car
w|sale|adj||A2|dirty|6481805|
w|fou|adj||A2|mad, crazy|4729918|folle (f)
w|drôle|adj||A1|funny; odd|5364427|
w|bizarre|adj||A2|strange, weird|15762|
w|simple|adj||A1|simple|8715395|
w|calme|adj||A1|calm, quiet|942309|
w|fort|adj||A1|strong; loud|1257191|il pleut fort = it's raining hard
w|dangereux|adj||A2|dangerous|3277416|dangereuse (f)
w|magnifique|adj||A2|wonderful, magnificent|3647879|
w|génial|adj||A2|great, brilliant|1853257|
w|parfait|adj||A1|perfect|839714|
w|normal|adj||A1|normal|2221270|
w|différent|adj||A1|different|1778384|
w|penser|verb||A1|to think|433582|je pense que oui = I think so
w|croire|verb||A1|to believe|930046|je crois, nous croyons
w|trouver|verb||A1|to find|1908793|
w|donner|verb||A1|to give|15151|
w|passer|verb||A1|to pass; to spend (time)|12175904|passer une bonne journée = to have a nice day
w|rester|verb||A1|to stay|3666035|false friend: not "to rest" (= se reposer)
w|partir|verb||A1|to leave|10796|je pars, nous partons
w|sortir|verb||A1|to go out|1117910|je sors, nous sortons
w|arriver|verb||A1|to arrive; to happen|13083|qu'est-ce qui arrive ? = what's happening?
w|attendre|verb||A1|to wait (for)|4679104|j'attends le bus = I'm waiting for the bus (no "for")
w|comprendre|verb||A1|to understand|10509566|like prendre: je comprends
w|connaître|verb||A1|to know (people, places)|12093232|je connais; facts = savoir (ES conocer / saber)
w|regarder|verb||A1|to look at, to watch|1121020|no "at": regarder la télé
w|chercher|verb||A1|to look for|8603063|no "for": je cherche Tom
w|aider|verb||A1|to help|1152137|
w|manger|verb||A1|to eat|2415913|nous mangeons
w|boire|verb||A1|to drink|3645684|je bois, nous buvons, ils boivent
w|dormir|verb||A1|to sleep|128566|je dors, nous dormons
w|travailler|verb||A1|to work|1832511|
w|jouer|verb||A1|to play|2462407|jouer au foot, jouer du piano
w|acheter|verb||A1|to buy|7070|j'achète, nous achetons
w|payer|verb||A1|to pay|1078224|
w|écrire|verb||A1|to write|2587894|j'écris, nous écrivons
w|lire|verb||A1|to read|4764171|je lis, nous lisons
w|écouter|verb||A1|to listen (to)|839678|no "to": écouter la radio
w|entendre|verb||A1|to hear|5375581|
w|ouvrir|verb||A1|to open|10721634|j'ouvre (like an -er verb)
w|fermer|verb||A1|to close|3657876|
w|commencer|verb||A1|to begin|2938178|nous commençons
w|finir|verb||A1|to finish|894599|je finis, nous finissons
w|apprendre|verb||A1|to learn; to teach|2826302|like prendre
w|habiter|verb||A1|to live (somewhere)|8933584|j'habite à Vilnius
w|vivre|verb||A1|to live|127951|je vis, nous vivons
w|rentrer|verb||A1|to go home, to come back|7166299|
w|entrer|verb||A1|to enter, to come in|2926524|entrez ! = come in!
w|appeler|verb||A1|to call|1005501|je m'appelle… = my name is…
w|oublier|verb||A1|to forget|1158391|
w|changer|verb||A1|to change|4862912|
w|perdre|verb||A1|to lose|3459612|
w|gagner|verb||A1|to win; to earn|4706423|
w|marcher|verb||A1|to walk; to work (machine)|11166423|ça marche = it works, OK
w|porter|verb||A1|to carry; to wear|131795|
w|mettre|verb||A1|to put; to put on|1995750|je mets, nous mettons
w|laisser|verb||A1|to leave; to let|1114453|
w|montrer|verb||A1|to show|11488349|
w|demander|verb||A1|to ask|2013783|false friend: not "to demand" (= exiger)
w|répondre|verb||A1|to answer|9311691|répondre à une question
w|expliquer|verb||A1|to explain|1081544|
w|essayer|verb||A1|to try|545122|
w|préférer|verb||A1|to prefer|3300671|je préfère, nous préférons
w|adorer|verb||A1|to love, to adore|1842923|
w|détester|verb||A1|to hate|2433133|
w|choisir|verb||A1|to choose|883063|like finir: je choisis, nous choisissons
w|rire|verb||A2|to laugh|8681878|je ris; faire rire = to make laugh
"""
