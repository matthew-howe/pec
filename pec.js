'use strict'

const { cardCodes, stringifyCardCode, setStringifyCardCodes } = require('phe')
const evaluate7Cards = require('phe/lib/evaluator7')
const evaluate5Cards = require('phe/lib/evaluator5')

const { allPossibleFullBoardCodes, allPossiblePostFlopBoardCodes } = require('./lib/board')
const { cardsArrayMinusBlockers } = require('./lib/common')
const EMPTY_ARRAY = []

function stringifyTrackedCardComboKeys(codedMap) {
  const map = new Map()
  for (const code of codedMap) {
    const k = code[0]
    const v = code[1]
    const s1 = stringifyCardCode(k[0])
    const s2 = stringifyCardCode(k[1])
    map.set(s1 + s2, v)
  }
  return map
}

//
// Compare Combos/Board
//

function compareStrengths(strength1, strength2) {
  return (
      strength1 === strength2 ?  0
    : strength1 < strength2   ? -1
    : 1
  )
}

function getBestOmaha5CardStrength(combos) {
  let bestStrength = Infinity;

  for (let i = 0; i < combos.length; i++) {
    let cur = combos[i];
    let str = evaluate5Cards(cur[0], cur[1], cur[2], cur[3], cur[4])
    if (str < bestStrength) {
      bestStrength = str;
    }
  }

  return bestStrength;
}

function getOmaha5CardCombos(combos, board) {
  let output = [];
  let i  = 0;
  let j  = 1;
  let k  = 2;
  let c1 = combos[0];
  let c2 = combos[1];

  while (k !== 4) {
    output.push([c1, c2, board[i], board[j], board[k]]);
    k++;
  }

  while (j !== 3) {
    output.push([c1, c2, board[i], board[j], board[k]]);
    j++;
  }

  while (i !== 3) {
    output.push([c1, c2, board[i], board[j], board[k]]);
    i++;
  }

  output.push([c1, c2, board[0], board[2], board[3]])
  output.push([c1, c2, board[1], board[2], board[3]])
  output.push([c1, c2, board[1], board[2], board[4]])

  return output;
}

function evaluate7CardsOmaha(b1, b2, b3, b4, b5, c1, c2) {
  let allCombos = getOmaha5CardCombos([c1, c2], [b1, b2, b3, b4, b5]);
  let bestStrength = getBestOmaha5CardStrength(allCombos);
  return bestStrength;
}

function compareTwoWithBoardExpanded(combo1First, combo1Second, combo2First, combo2Second, b1, b2, b3, b4, b5) {
  const strength1 = evaluate7Cards(b1, b2, b3, b4, b5, combo1First, combo1Second)
  const strength2 = evaluate7Cards(b1, b2, b3, b4, b5, combo2First, combo2Second)
  return (
      strength1 === strength2 ?  0
    : strength1 < strength2   ? -1
    : 1
  )
}

function compareTwoWithBoard(combo1First, combo1Second, combo2First, combo2Second, board) {
  return compareTwoWithBoardExpanded(
    combo1First, combo1Second, combo2First, combo2Second,
    board[0], board[1], board[2], board[3], board[4])
}

function compareSixWithBoardExpanded(c1, c2, c3, c4, c5, c6, b1, b2, b3, b4, b5) {
  // TODO: switch to 5 card evaluator
  const s1 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, c1[0], c1[1]);
  const s2 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, c2[0], c2[1]);
  const s3 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, c3[0], c3[1]);
  const s4 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, c4[0], c4[1]);
  const s5 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, c5[0], c5[1]);
  const s6 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, c6[0], c6[1]);
  const combos = [c1, c2, c3, c4, c5, c6];
  const strengths = [s1, s2, s3, s4, s5, s6];

  let bestCombo;
  let bestStrength = Infinity;

  for (let i = 0; i < 6; i++) {
    if (strengths[i] < bestStrength) {
      bestStrength = strengths[i];
      bestCombo = combos[i];
    }
  }

  return [bestCombo[0], bestCombo[1]];
}

function compareSixWithBoard(b1, b2, b3, b4, b5, combos) {
    const c1 = combos[0];
    const c2 = combos[1];
    const c3 = combos[2];
    const c4 = combos[3];
    const c5 = combos[4];
    const c6 = combos[5];

  return compareSixWithBoardExpanded(
    c1, c2, c3, c4, c5, c6, b1, b2, b3, b4, b5
  )
}


function compareOmahaWithBoardExpanded(combo1, combo2, b1, b2, b3, b4, b5) {
  const bestCombo1 = compareSixWithBoard(b1, b2, b3, b4, b5, combo1)
  const bestCombo2 = compareSixWithBoard(b1, b2, b3, b4, b5, combo2)


  const strength1 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, bestCombo1[0], bestCombo1[1])
  const strength2 = evaluate7CardsOmaha(b1, b2, b3, b4, b5, bestCombo2[0], bestCombo2[1])

  return (
      strength1 === strength2 ?  0
    : strength1 < strength2   ? -1
    : 1
  )
}

function compareOmahaWithBoard(combo1, combo2, board) {
  return compareOmahaWithBoardExpanded(
    combo1, combo2,
    board[0], board[1], board[2], board[3], board[4])
}


// allow excluding up to 4 (flop + turn)
function randomCardIdx(max, a, b, c, d) {
  while (true) {
    const n =  Math.floor(Math.random() * max)
    if (a < 0) return n
    if (n === a) continue

    if (b < 0) return n
    if (n === b) continue

    if (c < 0) return n
    if (n === c) continue

    if (d < 0) return n
    if (n !== d) return n
  }
}

//
// Generate Board
//
function randomBoard(cardArray, max) {
  const flop1 = randomCardIdx(max, -1, -1, -1, -1)
  const flop2 = randomCardIdx(max, flop1, -1, -1, -1)
  const flop3 = randomCardIdx(max, flop1, flop2, -1, -1)
  const turn  = randomCardIdx(max, flop1, flop2, flop3, -1)
  const river = randomCardIdx(max, flop1, flop2, flop3, turn)
  // avoiding slower array.map
  const flopCode1 = cardArray[flop1]
  const flopCode2 = cardArray[flop2]
  const flopCode3 = cardArray[flop3]
  const turnCode = cardArray[turn]
  const riverCode = cardArray[river]

  return [ flopCode1, flopCode2, flopCode3, turnCode, riverCode ]
}

function randomRemainingBoard(boardCodes, cardArray, max) {
  // Assumes that the boardCodes already are removed from cardArray
  const len = boardCodes.length
  const flop1 = len > 0 ? 999 : randomCardIdx(max, -1, -1, -1, -1)
  const flop2 = len > 1 ? 999 : randomCardIdx(max, flop1, -1, -1, -1)
  const flop3 = len > 2 ? 999 : randomCardIdx(max, flop1, flop2, -1, -1)
  const turn  = len > 3 ? 999 : randomCardIdx(max, flop1, flop2, flop3, -1)
  const river = randomCardIdx(max, flop1, flop2, flop3, turn)

  const flopCode1 = len > 0 ? boardCodes[0] : cardArray[flop1]
  const flopCode2 = len > 1 ? boardCodes[1] : cardArray[flop2]
  const flopCode3 = len > 2 ? boardCodes[2] : cardArray[flop3]
  const turnCode = len > 3 ? boardCodes[3] : cardArray[turn]
  const riverCode = cardArray[river]

  return [ flopCode1, flopCode2, flopCode3, turnCode, riverCode ]
}

//
// Race Codes
//
function raceCodesAllForBoard(combo1, combo2, hasBoard, boardCodes) {
  let blockers;
  if (combo1.length === 6) {
    // handle omaha blockers
    blockers = new Set();
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 2; j++) {
        blockers.add(combo1[i][j])
        blockers.add(combo2[i][j])
      }
    }
  } else {
    const combo1First  = combo1[0]
    const combo1Second = combo1[1]
    const combo2First  = combo2[0]
    const combo2Second = combo2[1]

    blockers = new Set([ combo1First, combo1Second, combo2First, combo2Second ])
  }

  const boards = hasBoard
    ? allPossiblePostFlopBoardCodes(blockers, boardCodes)
    : allPossibleFullBoardCodes(blockers)

  var win = 0
  var loose = 0
  var tie = 0

  // Evaluate all
  for (var b = 0; b < boards.length; b += 5) {
    let res;
    if (combo1.length === 6) {
      res = compareOmahaWithBoard(combo1, combo2, board)
    } else {
      res = compareTwoWithBoard(combo1First, combo1Second, combo2First, combo2Second, board)
    }
    if (res === 0) tie++
    else if (res < 0) win++
    else loose++

  }

  return { win, loose, tie }
}

function raceCodesRandomForBoard(combo1, combo2, times, hasBoard, boardCodes) {
  let blockers;
  if (combo1.length === 6) {
    // handle omaha blockers
    blockers = new Set();
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 2; j++) {
        blockers.add(combo1[i][j])
        blockers.add(combo2[i][j])
      }
    }
  } else {
    const combo1First  = combo1[0]
    const combo1Second = combo1[1]
    const combo2First  = combo2[0]
    const combo2Second = combo2[1]

    blockers = new Set([ combo1First, combo1Second, combo2First, combo2Second ])
  }

  if (hasBoard) {
    for (var bi = 0; bi < boardCodes.length; bi++) blockers.add(boardCodes[bi])
  }

  const cardArray = cardsArrayMinusBlockers(blockers)
  const cardArrayLen = cardArray.length

  var win = 0
  var loose = 0
  var tie = 0

  for (var i = 0; i < times; i++) {
    const board = hasBoard
      ? randomRemainingBoard(boardCodes, cardArray, cardArrayLen)
      : randomBoard(cardArray, cardArrayLen)

    let res;
    if (combo1.length === 6) {
      res = compareOmahaWithBoard(combo1, combo2, board)
    } else {
      res = compareTwoWithBoard(combo1First, combo1Second, combo2First, combo2Second, board)
    }
    if (res === 0) tie++
    else if (res < 0) win++
    else loose++

  }

  return { win, loose, tie }
}

function _raceCodesForBoard(combo1, combo2, times, hasBoard, boardCodes) {

  return times == null
    ? raceCodesAllForBoard(combo1, combo2, hasBoard, boardCodes)
    : raceCodesRandomForBoard(combo1, combo2, times, hasBoard, boardCodes)
}

/**
 * Same as @see raceCombosForBoard, except that the combo cards are given
 * as their codes obtained via [phe](https://github.com/thlorenz/phe) `cardCodes`.
 */
function raceCodesForBoard(combo1, combo2, times, board) {
  return _raceCodesForBoard(combo1, combo2, times, true, board)
}

/**
 * Same as @see raceCombos, except that the combo cards are given
 * as their codes obtained via [phe](https://github.com/thlorenz/phe) `cardCodes`.
 */
function raceCodes(combo1, combo2, times) {
  return _raceCodesForBoard(combo1, combo2, times, false, EMPTY_ARRAY)
}

//
// Race Range Codes
//
function _raceRangeCodesForBoard(comboCodes1, rangeCodes, times, trackCombos, hasBoard, boardCodes) {
  var winCombo = 0
  var winRange = 0
  var tieBoth = 0
  trackCombos = !!trackCombos
  const comboCodeMap = trackCombos ? new Map() : null
  for (var ci = 0; ci < rangeCodes.length; ci++) {
    const comboCodes2 = rangeCodes[ci]
    const { win, loose, tie } = hasBoard
      ? _raceCodesForBoard(comboCodes1, comboCodes2, times, hasBoard, boardCodes)
      : raceCodes(comboCodes1, comboCodes2, times)

    if (trackCombos) comboCodeMap.set(comboCodes2, { win, loose, tie })
    winCombo += win
    winRange += loose
    tieBoth += tie
  }
  const res = { win: winCombo, loose: winRange, tie: tieBoth }
  if (trackCombos) res.combos = comboCodeMap
  return res
}

/**
 * Same as @see raceRangeForBoard, except that the combo, range cards and board are given
 * as their codes obtained via [phe](https://github.com/thlorenz/phe) `cardCodes`.
 */
function raceRangeCodesForBoard(comboCodes, rangeCodes, times, trackCombos, boardCodes) {
  return _raceRangeCodesForBoard(comboCodes, rangeCodes, times, trackCombos, true, boardCodes)
}

/**
 * Same as @see raceRange, except that the combo and range cards are given
 * as their codes obtained via [phe](https://github.com/thlorenz/phe) `cardCodes`.
 */
function raceRangeCodes(combo1, range, times, trackCombos) {
  return _raceRangeCodesForBoard(combo1, range, times, trackCombos, false, EMPTY_ARRAY)
}

//
// Race Combos
//
function _raceCombosForBoard(combo1, combo2, times, hasBoard, boardCodes) {
  if (combo1.length === 2) {
    const comboCodes1 = cardCodes(combo1)
    const comboCodes2 = cardCodes(combo2)
    return _raceCodesForBoard(comboCodes1, comboCodes2, times, hasBoard, boardCodes)
  } else {
    const comboCodes1 = omahaCardCodes(combo1);
    const comboCodes2 = omahaCardCodes(combo2);
    return _raceCodesForBoard(comboCodes1, comboCodes2, times, hasBoard, boardCodes)
  }
}

/**
 * Races two combos against each other.
 *
 * @name raceCombosForBoard
 * @function
 * @param {Array.<string>} combo1 first combo to race i.e. `[ 'As', 'Ad' ]`
 * @param {Array.<string>} combo2 second combo to race i.e. `[ 'As', 'Ad' ]`
 * @param {Number} [times=null] the number of times to race, if not supplied combos are races against all possible boards
 * @param {Array.<string>}[board=null] omit for preflop, but provide for
 * postflop to race against boards that just add a turn or river card to the given one
 * @return count of how many times combo1 wins, looses or ties, i.e. `{ win, loose, tie }`
 */
function raceCombosForBoard(combo1, combo2, times, board) {
  const boardCodes = cardCodes(board)
  return _raceCombosForBoard(combo1, combo2, times, true, boardCodes)
}

/**
 * Races two combos against each other.
 *
 * @name raceCombos
 * @function
 * @param {Array.<string>} combo1 first combo to race i.e. `[ 'As', 'Ad' ]`
 * @param {Array.<string>} combo2 second combo to race i.e. `[ 'As', 'Ad' ]`
 * @param {Number} [times=null] the number of times to race, if not supplied combos are races against all possible boards
 * @return count of how many times combo1 wins, looses or ties, i.e. `{ win, loose, tie }`
 */
function raceCombos(combo1, combo2, times) {
  return _raceCombosForBoard(combo1, combo2, times, false, EMPTY_ARRAY)
}

function _raceRangeForBoard(combo, range, times, trackCombos, hasBoard, boardCodes) {
  const comboCodes = cardCodes(combo)
  const rangeCodes = range.map(cardCodes)
  const res = hasBoard
    ? raceRangeCodesForBoard(comboCodes, rangeCodes, times, trackCombos, boardCodes)
    : raceRangeCodes(comboCodes, rangeCodes, times, trackCombos)

  if (trackCombos) res.combos = stringifyTrackedCardComboKeys(res.combos)
  return res
}

//
// Race Range
//
/**
 * Race the given combo vs. the given combo to count number of wins, losses and ties.
 * The boards created for the race will include all cards of the given board.
 *
 * @name raceRangeForBoard
 * @function
 * @param {Array.<string>} combo to race i.e. `[ 'As', 'Ad' ]`
 * @param {Array.<Array.<string>>} range multiple combos to raise against it, i.e. `[ [ 'Ks', 'Kd' ], [ 'Qs', 'Qd' ] ]`
 * @param {Number} [times=null] the number of times to race, if not supplied combos are races against all possible boards
 * @param {Boolean} [trackCombos=false] if `true` the counts for each combos are tracked
 * @param {Array.<string>}[board=null] omit for preflop, but provide for
 * postflop to race against boards that just add a turn or river card to the given one
 * @return count of how many times the combo wins, looses or ties, i.e. `{ win, loose, tie }`
 */
function raceRangeForBoard(combo, range, times, trackCombos, board) {
  const boardCodes = cardCodes(board)
  return _raceRangeForBoard(combo, range, times, trackCombos, true, boardCodes)
}

/**
 * Race the given combo vs. the given combo to count number of wins, losses and ties.
 *
 * @name raceRange
 * @function
 * @param {Array.<string>} combo to race i.e. `[ 'As', 'Ad' ]`
 * @param {Array.<Array.<string>>} range multiple combos to raise against it, i.e. `[ [ 'Ks', 'Kd' ], [ 'Qs', 'Qd' ] ]`
 * @param {Number} [times=null] the number of times to race, if not supplied combos are races against all possible boards
 * @param {Boolean} [trackCombos=false] if `true` the counts for each combos are tracked
 * @return count of how many times the combo wins, looses or ties, i.e. `{ win, loose, tie }`
 */
function raceRange(combo, range, times, trackCombos) {
  return _raceRangeForBoard(combo, range, times, trackCombos, false, EMPTY_ARRAY)
}

/**
 * Given win, loose and tie count it converts those to winning rates
 * in percent.
 *
 * @name rates
 * @function
 * @param {Object} $0
 * @param {Number} $0.win number of wins
 * @param {Number} $0.loose number of losses
 * @param {Number} $0.tie number of ties
 * @param {Map.<String, Number>} [$0.combos=null] map of counts per combo,
 * if given their rates are calculated as well
 * @return {Object} win rates `{ winRate, looseRate, tieRate, combos? }
 */
function rates({ win, loose, tie, combos }) {
  const total = win + loose + tie
  const winRate = Math.round(win / total * 100 * 100) / 100
  const looseRate = Math.round(loose / total * 100 * 100) / 100
  const tieRate = Math.round(tie / total * 100 * 100) / 100

  if (combos == null) return { winRate, looseRate, tieRate }

  const map = new Map()
  for (const combo of combos) {
    const k = combo[0]
    const v = combo[1]
    map.set(k, rates(v))
  }
  return { winRate, looseRate, tieRate, combos: map }
}

function hello() {
  return 'hello world'
}

// Omaha Utilities
function getOmahaCombos(hand) {
  const combos = new Set()
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (i === j) continue;
      else if (combos.has(hand[j] + hand[i])) continue;
      else combos.add(hand[i] + hand[j])
    }
  }
  let output = []
  combos.forEach(el => output.push([el[0] + el[1], el[2] + el[3]]))
  return output;
}

function omahaCardCodes(hand) {
  const combos = getOmahaCombos(hand)
  return combos.map(cardCodes);
}


module.exports = {
    raceCodes
  , raceCodesForBoard
  , raceRangeCodes
  , raceRangeCodesForBoard
  , raceCombos
  , raceCombosForBoard
  , raceRange
  , raceRangeForBoard
  , rates
  , hello
}
