# Third-party material

| Material | Where | Source | Licence |
|---|---|---|---|
| Example sentences and their translations | `examples` and `source: "tatoeba:<id>"` in `content/**` | [Tatoeba](https://tatoeba.org) — sentence `https://tatoeba.org/en/sentences/show/<id>` | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/) (some sentences CC0) |
| Lithuanian stress marks | `content/lt/stress.yaml` | [English Wiktionary](https://en.wiktionary.org), collected by `scripts/stress.py` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Word frequency lists (used to choose words; not shipped) | `.cache/sources/` (not in the repository) | Hermit Dave, [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (OpenSubtitles 2018) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Pronunciation audio, existing files | `apps/miniapp/public/audio/` | generated with Microsoft Edge read-aloud voices via `edge-tts` | no explicit redistribution licence — kept for the original deployment; new audio for the foundation course uses a voice with an open licence (docs/EXTENSION-PLAN.md §7) |
| Pronunciation audio of the Lithuanian foundation course (words, phrases, lessons, listening) | `apps/miniapp/public/audio/lt/` — entries made by `scripts/tts_reginute.py` | Piper voice [lt_LT-reginute1-medium "Reginutė"](https://github.com/kubataba/sayfable-models/releases/tag/piper-lt-v1) by Robertas Tarasevičius, trained on the LIEPA corpus (Vilnius University); stress-aware phonemizer [RobertasTa/reginute](https://github.com/RobertasTa/reginute) (GPL-3.0) used only locally to make the audio, not shipped | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

Everything else: code — [MIT](LICENSE); own learning content — [CC BY-SA 4.0](content/LICENSE.md).
