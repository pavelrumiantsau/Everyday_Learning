import type { Smoke } from "./context.ts";

// Writing tasks and speaking situations (docs/EXTENSION-PLAN.md §6.5): on the copy's Worker after 16-course.ts
// (foundation learner). /task sends the next task, the next text answer is scored by the (fake) AI.
export default async function (t: Smoke) {
  const { post, msg, calls, check, api, me, llm } = t;
  const sent = () => calls.filter((c) => c.method === "sendMessage").map((c) => String(c.body.text));
  const waitFor = async (pred: () => boolean, ms = 15_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) if (pred()) return true;
    return false;
  };

  calls.length = 0;
  await post(msg("/task"));
  check(sent().some((s) => s.includes("Письменное задание") && s.includes("Parašykite apie save")), "/task sends the first writing task of unit 1");

  calls.length = 0;
  llm.requests.length = 0;
  await post(msg("Labas! Mano vardas Anna. Aš esu iš Rusijos. Aš eina į darbą."));
  check(await waitFor(() => sent().some((s) => s.includes("Оценка: 2/3"))), "the answer is scored on the exam scale (0–3)");
  const result = sent().find((s) => s.includes("Оценка")) ?? "";
  check(result.includes("✅") && result.includes("❌") && result.includes("Пример ответа"), "the result shows the checklist and the model answer");
  const prompt = llm.requests.map((r) => r.body).find((b) => b.includes("examiner")) ?? "";
  check(prompt.includes("Parašykite apie save") && prompt.includes("Имя и фамилия"), "the AI gets the task, its instruction and the checklist");

  calls.length = 0;
  await post(msg("Labas, kaip sekasi?"));
  check(await waitFor(() => sent().length > 0) && !sent().some((s) => s.includes("Оценка")), "after the answer the task is closed: the next text isn't scored again");

  const unit = (await (await api("/course/units/u01", me)).json()) as { tasks: { id: string; best: number | null }[] };
  check(unit.tasks.find((x) => x.id === "lt-t-0001")?.best === 2, "the unit page shows the best score of the task");

  calls.length = 0;
  check((await api("/tasks/lt-s-0001/start", me, { method: "POST" })).ok && sent().some((s) => s.includes("Устная ситуация")), "«Сделать в чате» sends a speaking task");
  calls.length = 0;
  await post(msg("Mano vardas Ivanas"));
  check(sent().some((s) => s.includes("ответьте голосовым")), "a speaking task asks for a voice message, not text");
  calls.length = 0;
  await post(msg("/task skip"));
  check(sent().some((s) => s.includes("отложено")), "/task skip puts the task aside");
}

/** The original bot: no /task in help, /task explains, no tasks API. */
export async function ownerSide(t: Smoke) {
  const { post, msg, calls, check, api, me } = t;
  calls.length = 0;
  await post(msg("/task"));
  check(calls.length === 1 && String(calls[0]!.body.text).includes("курсе литовского"), "original bot: /task only explains");
  check((await api("/tasks/lt-t-0001/start", me, { method: "POST" })).status === 404, "original bot: tasks API → 404");
}
