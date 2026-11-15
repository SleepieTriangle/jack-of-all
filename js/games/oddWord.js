/* Odd Word Out — Word Sense. Which word doesn't belong? Early on the odd word
   comes from a totally different group (cow, pig, goat… piano). Later it comes
   from a close cousin of the group (whale, dolphin, seal… shark). */
(function () {
  const J = window.JOA;

  // id: [label (plural, for explanations), words]. No word appears in two groups.
  const CATS = {
    farm: ['farm animals', 'cow pig sheep goat horse chicken donkey'],
    sea: ['sea creatures', 'octopus crab jellyfish starfish squid lobster'],
    fruit: ['fruits', 'apple banana grape cherry pear mango strawberry peach'],
    veg: ['vegetables', 'carrot potato onion broccoli cabbage lettuce spinach celery'],
    color: ['colors', 'red blue green yellow purple pink brown'],
    vehicle: ['vehicles', 'car bus train truck bicycle airplane tractor scooter'],
    clothes: ['clothes', 'shirt sock hat coat scarf jacket glove dress'],
    body: ['body parts', 'hand nose ear knee elbow finger shoulder chin'],
    shape: ['shapes', 'circle square triangle rectangle oval hexagon'],
    weather: ['kinds of weather', 'rain snow wind sunshine fog hail thunder'],
    toy: ['toys', 'doll robot puzzle yo-yo marbles blocks'],
    music: ['musical instruments', 'piano guitar drum violin flute trumpet harp'],
    furniture: ['furniture', 'chair table bed sofa desk shelf wardrobe'],
    drink: ['drinks', 'milk juice water tea lemonade cocoa smoothie'],
    insect: ['insects', 'ant bee butterfly ladybug beetle grasshopper mosquito'],
    bird: ['birds', 'robin eagle owl parrot penguin crow sparrow'],
    job: ['jobs', 'doctor teacher farmer pilot chef firefighter nurse'],
    kitchen: ['kitchen tools', 'spoon fork pot pan whisk ladle spatula'],
    day: ['days of the week', 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday'],
    // adult groups
    planet: ['planets', 'Venus Mars Jupiter Saturn Neptune Uranus'],
    metal: ['metals', 'iron copper silver gold zinc nickel aluminum'],
    gem: ['gemstones', 'ruby emerald sapphire diamond topaz opal amethyst'],
    europe: ['European countries', 'France Spain Italy Germany Portugal Norway Greece'],
    capital: ['capital cities', 'Paris Rome Madrid Berlin Lisbon Oslo Athens'],
    seaMammal: ['sea mammals', 'whale dolphin seal walrus manatee'],
    fish: ['fish', 'shark tuna salmon cod trout eel carp'],
    reptile: ['reptiles', 'lizard snake turtle crocodile iguana gecko tortoise'],
    amphibian: ['amphibians', 'frog toad newt salamander axolotl'],
    happyW: ['words meaning happy', 'glad cheerful joyful content merry delighted jolly'],
    sadW: ['words meaning sad', 'gloomy unhappy miserable glum downcast sorrowful'],
    bigW: ['words meaning big', 'huge giant enormous massive vast immense colossal'],
    smallW: ['words meaning small', 'tiny little miniature petite minute wee'],
    composer: ['composers', 'Mozart Bach Beethoven Chopin Vivaldi Handel Haydn'],
    painter: ['painters', 'Picasso Monet Rembrandt Dali Matisse Vermeer'],
    organ: ['organs of the body', 'heart lung liver kidney brain stomach spleen'],
    bone: ['bones', 'femur skull rib tibia pelvis clavicle sternum'],
    tree: ['trees', 'oak maple pine birch willow cedar elm'],
    flower: ['flowers', 'marigold tulip daisy lily orchid daffodil poppy'],
    currency: ['currencies', 'dollar euro yen peso rupee franc krona'],
    length: ['units of length', 'meter inch mile kilometer centimeter millimeter'],
    weight: ['units of weight', 'gram kilogram ounce ton milligram'],
    ballSport: ['ball sports', 'soccer tennis basketball golf volleyball rugby baseball'],
    waterSport: ['water sports', 'swimming diving surfing rowing sailing canoeing'],
  };
  const KID = ['farm', 'sea', 'fruit', 'veg', 'color', 'vehicle', 'clothes', 'body', 'shape', 'weather', 'toy', 'music', 'furniture', 'drink', 'insect', 'bird', 'job', 'kitchen', 'day'];
  const ADULT = Object.keys(CATS).filter((k) => !KID.includes(k)).concat(['sea', 'bird', 'insect', 'job', 'music']);
  // Close cousins: the odd word comes from the partner group — much trickier.
  const NEAR = [
    ['fruit', 'veg'], ['bird', 'insect'], ['farm', 'sea'], ['music', 'toy'], ['clothes', 'body'], ['drink', 'kitchen'],
    ['seaMammal', 'fish'], ['reptile', 'amphibian'], ['happyW', 'sadW'], ['bigW', 'smallW'], ['europe', 'capital'],
    ['composer', 'painter'], ['organ', 'bone'], ['tree', 'flower'], ['metal', 'gem'], ['length', 'weight'], ['ballSport', 'waterSport'], ['planet', 'metal'],
  ];
  // Groups that overlap in meaning (gold is a metal AND a color) never mix.
  const AVOID = [['color', 'metal'], ['color', 'gem'], ['color', 'flower'], ['color', 'fruit'], ['fish', 'sea'], ['seaMammal', 'sea'], ['drink', 'fruit'], ['weather', 'waterSport']];
  const clash = (x, y) => NEAR.concat(AVOID).some((p) => p.includes(x) && p.includes(y));
  const words = (id) => CATS[id][1].split(' ');

  function question(r, L, kid) {
    const size = L <= 4 || kid ? 4 : 5;
    const pool = kid || L <= 4 ? KID : L <= 6 ? KID.concat(ADULT) : ADULT;
    const nearChance = L <= 2 ? 0 : L <= 4 ? 0.5 : L <= 6 ? 0.6 : 1;
    let a, b;
    const nearOk = NEAR.filter(([x, y]) => pool.includes(x) && pool.includes(y));
    if (nearOk.length && r.chance(nearChance)) [a, b] = r.shuffle(r.pick(nearOk));
    else {
      a = r.pick(pool);
      b = r.pick(pool.filter((x) => x !== a && !clash(a, x)));
    }
    const group = r.shuffle(words(a)).slice(0, size - 1);
    const odd = r.pick(words(b));
    const options = r.shuffle(group.concat([odd]));
    return { a, b, odd, options, key: options.slice().sort().join(',') };
  }

  J.register({
    id: 'oddWord',
    name: 'Odd Word Out',
    icon: '🗂️',
    skill: 'Word Sense',
    color: '#4d7c0f',
    tagline: 'Which word doesn\'t belong with the others?',
    why: 'Sorting words into groups builds vocabulary, general knowledge and verbal reasoning — how the brain organizes what it knows.',
    howTo: 'Every set of words has one that doesn\'t belong. Tap it! Early levels mix very different things; later the odd word is a close cousin (a shark among sea mammals, a capital city among countries). 10 sets.',
    helpers: ['<b>Hint</b> tells you what most of the words have in common.', 'A wrong pick gets <b>one more try</b> (worth half points).'],
    mount(root, ctx) {
      const { rng, level, finish, kid } = ctx;
      let helpers = ctx.helpers;
      const ROUNDS = 10;
      const hist = J.seenHistory('oddWord');
      const round = new Set();
      const qs = Array.from({ length: ROUNDS }, () => J.pickUnique(() => question(rng, level, kid), (q) => q.key, round, hist));
      hist.save();
      let i = 0, points = 0, right = 0, timer = null;

      function show() {
        const q = qs[i];
        let retried = false;
        root.innerHTML = `
          <div class="g-bar"><span>Set ${i + 1} of ${ROUNDS}</span><span class="muted">✅ ${right}</span></div>
          <div class="g-progress"><i style="width:${(i / ROUNDS) * 100}%"></i></div>
          <div class="g-center">
            <p class="g-question">Which word <b>doesn't belong</b>?</p>
            <div class="ow-words">${q.options.map((w) => `<button class="choice ow-word" data-w="${w}">${w}</button>`).join('')}</div>
            <div class="btn-row" style="justify-content:center"><button class="btn ghost small hint">💡 Hint</button></div>
            <div class="helper-tip ow-tip" hidden>Most of these words are <b>${CATS[q.a][0]}</b>.</div>
            <div class="g-msg"></div>
          </div>`;
        const hintBtn = root.querySelector('.hint');
        hintBtn.hidden = !helpers;
        hintBtn.addEventListener('click', () => (root.querySelector('.ow-tip').hidden = false));
        root.querySelectorAll('.ow-word').forEach((b) =>
          b.addEventListener('click', () => {
            const ok = b.dataset.w === q.odd;
            if (!ok && helpers && !retried) {
              retried = true;
              b.disabled = true;
              b.classList.add('wrongpick');
              const m = root.querySelector('.g-msg');
              m.className = 'g-msg bad';
              m.textContent = `"${b.dataset.w}" fits with the others — try again!`;
              return;
            }
            if (ok) {
              right++;
              points += retried ? 0.5 : 1;
            }
            root.querySelectorAll('.ow-word').forEach((c) => {
              c.disabled = true;
              if (c.dataset.w === q.odd) c.classList.add('right');
            });
            if (!ok) b.classList.add('wrongpick');
            const m = root.querySelector('.g-msg');
            m.className = 'g-msg ' + (ok ? 'good' : 'bad');
            m.innerHTML = `${ok ? '✓' : '✗'} <b>${q.odd}</b> is one of the ${CATS[q.b][0]}. The others are ${CATS[q.a][0]}.`;
            hintBtn.remove();
            i++;
            timer = setTimeout(() => (i < ROUNDS ? show() : end()), ok ? 1500 : 2600);
          })
        );
      }

      function end() {
        finish((points / ROUNDS) * 100, `${right} of ${ROUNDS} correct.`);
      }

      show();
      return {
        cleanup: () => clearTimeout(timer),
        setHelpers(on) {
          helpers = on;
          const h = root.querySelector('.hint');
          if (h) h.hidden = !on;
          if (!on) {
            const t = root.querySelector('.ow-tip');
            if (t) t.hidden = true;
          }
        },
      };
    },
  });

  J._oddWord = { CATS, KID, ADULT, NEAR, AVOID, question };
})();
