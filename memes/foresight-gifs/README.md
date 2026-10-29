# Foresight data GIFs (EffectCraft)

Four original animated GIFs built in EffectCraft from public data. Each is 1080x1080 at 30 fps (MP4) with a 600 px, 15 fps GIF for posting. No third-party footage is used.

| File | Joke | Data |
|---|---|---|
| 20_polio_progress_bar | Humanity "installing" a polio-free world, stuck at 99.97% | Wild polio: ~350,000 cases (1988) to 99 (2024), Global Polio Eradication Initiative |
| 21_voyager_light_day | Voyager 1's reply delay ticks up to 24 hours | Launched 1977; one light-day from Earth on 18 Nov 2026 (NASA) |
| 22_genome_price_crash | Moore's law has entered the chat | NHGRI cost per genome: ~$95M (2001) to ~$500 (2022) |
| 23_child_deaths_dots | Each fading dot is 100,000 kids who grew up | UN IGME 2024: under-5 deaths 12.8M (1990) to 4.9M (2022) |

Counters tick between the two real endpoints only; no in-between years are labelled with values.

To rebuild: `python3 source/build.py`, then `effectcraft-cli render source/gifs.ecproj --comp <Polio|Voyager|Genome|Children> --out <name>.mp4`.
