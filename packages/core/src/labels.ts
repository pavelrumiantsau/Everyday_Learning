// Human-readable grammar labels in the explanation language (RU for Lithuanian, EN for Spanish/French).
type Labelled = { id: string; pos?: string; gender?: string; plural_only?: boolean };

const POS_RU: Record<string, string> = {
  noun: "сущ.", verb: "глаг.", adj: "прил.", adv: "нареч.", pron: "мест.", prep: "предлог", conj: "союз", num: "числ.", part: "частица", phrase: "выражение",
};
const GENDER_RU: Record<string, string> = { m: "м. р.", f: "ж. р.", n: "ср. р.", mf: "м./ж. р." };
const GENDER_EN: Record<string, string> = { m: "masc.", f: "fem.", n: "neut.", mf: "masc./fem." };

export function grammarLabel(item: Labelled): string {
  const ru = item.id.startsWith("lt-");
  const parts = ru
    ? [item.pos && POS_RU[item.pos], item.gender && GENDER_RU[item.gender], item.plural_only && "только мн. ч."]
    : [item.pos, item.gender && GENDER_EN[item.gender], item.plural_only && "plural only"];
  return parts.filter(Boolean).join(", ");
}

export function principalFormsLine(item: { text: string; stress?: string; forms?: { pres: string; past: string }; gen?: string }): string {
  const head = item.stress ?? item.text;
  if (item.forms) return `${head}, ${item.forms.pres}, ${item.forms.past}`;
  if (item.gen) return `${head}, ${item.gen}`;
  return head;
}
