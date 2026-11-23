/* The work shown on the page. To add a piece: put its preview in media/shorts/<id>.mp4 (silent loop) and
   media/shorts/<id>.jpg (poster), then add an entry below. `yt` is the YouTube video id. */
window.WORKS = {
  episodesPublished: 71,

  films: [
    {
      title: 'MOTION DETECTED: 2100',
      yt: 'PeM1hyBoIdk',
      length: '1:40',
      poster: 'media/films/motion-detected-2100.jpg',
      alt: 'Underwater camera-trap frame of a hellbender salamander on a clear stream bed, stamped STN-04, 2100-06-15, with the caption "the river can see again."',
      logline: 'Same cameras. Same angles. 74 years apart. Seven camera-trap views of real places, imagined in 2026 and again in 2100. No flying cars and no miracle: just the slow work of putting nature back, recorded by the same cameras.',
      meta: ['2026', 'Generative video', 'Existential Hope Meme Prize']
    },
    {
      title: 'Nobody’s Job',
      yt: 'Z0g9HjkkowA',
      length: '1:50',
      poster: 'media/films/nobodys-job.jpg',
      alt: 'A dead rocket stage and a satellite above the Earth, under the line "Only 11,000 work now."',
      logline: 'Every number in this film is real. About 40,000 objects are tracked in Earth orbit and only 11,000 still work. The villain is a nine-tonne dead rocket stage. The twist is physics: you don’t have to bring it down. You have to make it late.',
      meta: ['2026', 'Generative video', 'Existential Hope Meme Prize']
    },
    {
      title: 'The Future Is Buildable',
      yt: 'KBVE8f7A6Xk',
      length: '1:55',
      poster: 'media/films/the-future-is-buildable.jpg',
      alt: 'A toy figure in a yellow jacket presses a teal block into a white baseplate, with a mountain village behind.',
      logline: 'The future is not something we wait for. It is something we build. A toy-scale mountain valley, assembled piece by piece, asks one question: what are we building?',
      meta: ['2026', 'Generative video', 'Existential Hope Meme Prize']
    }
  ],

  /* Shorts grid, newest first. */
  shorts: [
    { id: 'ep105', yt: 'wOyCDPzGqG8', title: 'How long until women and men are equal?', tag: 'Illustration' },
    { id: 'ep103', yt: 'EdiZ6BLc8Vo', title: 'Why is it winter when Earth is closest to the Sun?', tag: 'Orbit model' },
    { id: 'ep101', yt: 'RTy4gyI-J0E', title: 'How far can you actually see?', tag: 'True-scale Earth' }
  ],

  /* Long-form Zingkha explainers (16:9). */
  long: [
    { yt: 'TcoXplBwgQE', title: 'What actually happens when you press Run?', length: '3 min', poster: 'media/long/ep104.jpg', tag: 'Zingkha Explains \u00b7 Seven layers between the click and the output' },
    { yt: 'NVlw_svmU0g', title: 'Why are languages dying?', length: '3 min', poster: 'media/long/ep102.jpg', tag: 'Zingkha Explains \u00b7 6,702 living languages, placed where they are spoken' }
  ],

  /* Hero film strip: ids of previews, in order. */
  strip: ['ep105', 'ep103', 'ep101']
};
