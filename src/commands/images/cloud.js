const { createCanvas } = require("canvas");
const WordCloud = require("node-wordcloud")(createCanvas);
const axios = require("axios").default;
const {
  ApplicationCommandOptionType,
  AttachmentBuilder,
} = require("discord.js");

const getAuth = require("../util/getAuth");
const getAllListens = require("../general/util/getAllListens");

const { devEmail } = require("../../../config.json");

async function getSongTags(mbids, listenBrainzToken) {
  const BASE_URL = `https://api.listenbrainz.org/1/metadata/recording/`;
  const AUTH_HEADER = {
    Authorization: `Token ${listenBrainzToken}`,
    "User-Agent": `DiscordBrainzBot/1.0.0 (${devEmail})`,
  };
  const PARAMS = {
    params: {
      recording_mbids: mbids,
      inc: "tag",
    },
    headers: AUTH_HEADER,
  };

  const response = await axios
    .post(BASE_URL, PARAMS.params)
    .catch(function (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log("Error", error.message);
      }
      console.log(error.config);
      return "error";
    });

  const tags = response.data;

  return tags;
}

module.exports = {
  name: "cloud",
  description: "Generate a word cloud from your recent listens!",
  category: "Images",

  options: [
    {
      name: "user",
      description: "A ListenBrainz username",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "tags",
      description: "The number of tags to display",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "background-color",
      description: "The background color of the word cloud",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "color",
      description: "The color of the words in the word cloud",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "image-size-x",
      description: "The width of the image",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "image-size-y",
      description: "The height of the image",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "min-size",
      description: "The minimum size of the words (default 1)",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "max-size",
      description: "The maximum size of the words (default 100)",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "grid-size",
      description: "The grid size of the word cloud",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
  ],

  callback: async (client, interaction) => {
    const { brainzUsername, listenBrainzToken } = await getAuth(interaction);
    if (interaction.replied) {
      return;
    }

    const xDimension = interaction.options.get("image-size-x")?.value || 500;
    const yDimension = interaction.options.get("image-size-y")?.value || 500;
    const backgroundColor =
      interaction.options.get("background-color")?.value || "rgba(0,0,0,0)";
    const color = interaction.options.get("color")?.value || "#666";
    const numberOfTags = interaction.options.get("tags")?.value || 500;
    const minSize = interaction.options.get("min-size")?.value || 1;
    const maxSize = interaction.options.get("max-size")?.value || 100;
    const gridSize = interaction.options.get("grid-size")?.value || 4;

    const recentlyPlayed = await getAllListens(
      listenBrainzToken,
      brainzUsername,
      1000
    );

    let recentlyPlayedWithMBID = [];
    recentlyPlayed.listens.forEach((item) => {
      if (item.track_metadata.mbid_mapping) {
        recentlyPlayedWithMBID.push(item);
      }
    });

    let MBIDList = [];
    recentlyPlayedWithMBID.forEach(async (item) => {
      MBIDList.push(item.track_metadata.mbid_mapping.recording_mbid);
    });

    const allTagsList = await getSongTags(MBIDList, listenBrainzToken);

    let wordCloudList = [];
    Object.values(allTagsList).forEach((tags) => {
      if (tags.tag.artist[0]) {
        tags.tag.artist.forEach((tag) => {
          wordCloudList.push(tag.tag);
        });
      }
      if (tags.tag.recording[0]) {
        tags.tag.recording.forEach((tag) => {
          wordCloudList.push(tag.tag);
        });
      }
      if (tags.tag.release_group[0]) {
        tags.tag.release_group.forEach((tag) => {
          wordCloudList.push(tag.tag);
        });
      }
    });

    let wordCount = wordCloudList.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
    let finalList = Object.entries(wordCount).map(([word, count]) => [
      word,
      count,
    ]);

    finalList.sort((a, b) => b[1] - a[1]);

    let list = finalList.slice(0, numberOfTags);

    const canvas = createCanvas(xDimension, yDimension);

    const options = {
      gridSize: gridSize,
      rotateRatio: 0.5,
      rotationSteps: 2,
      rotationRange: [0, 90],
      backgroundColor: backgroundColor,
      sizeRange: [minSize, maxSize],
      color: color,
      fontFamily: `"PingFang SC", "Microsoft YaHei", "Segoe UI Emoji", "Segoe UI Emoji","Segoe UI Historic"`,
      //   shape: "circle",
    };

    const wordcloud = WordCloud(canvas, { list, ...options });

    wordcloud.draw();

    const png = await canvas.toBuffer();
    const attachment = new AttachmentBuilder(await png, {
      name: "chart.png",
    });

    interaction.editReply({ files: [attachment] });
  },
};
