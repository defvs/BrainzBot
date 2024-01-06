const jsdom = require("jsdom");
const { JSDOM } = jsdom;
global.DOMParser = new JSDOM().window.DOMParser;
const canvas = require("canvas");
const fetch = require("node-fetch");
const { Canvg, presets } = require("canvg");
const axios = require("axios");

const preset = presets.node({
  DOMParser,
  canvas,
  fetch,
});

module.exports = async (link) => {
  const response = await axios.get(link);
  const svg = response.data;
  const canvas = preset.createCanvas(800, 600);
  const ctx = canvas.getContext("2d");
  const v = Canvg.fromString(ctx, svg, preset);

  // Render only first frame, ignoring animations.
  await v.render();

  const png = canvas.toBuffer();
  return png;
};
