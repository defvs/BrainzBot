const {
  ApplicationCommandOptionType,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");

const convertSvgToPng = require("../util/convertSvgToPng");
const getAuth = require("../util/getAuth");

module.exports = {
  name: "chart",
  description: "Display scrobbles in a nice and neat chart!",
  category: "Images",

  options: [
    {
      name: "user",
      description: "A ListenBrainz username",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "timeperiod",
      description: "Time period",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        {
          name: "Week",
          value: "week",
        },
        {
          name: "Month",
          value: "month",
        },
        {
          name: "Half-year",
          value: "half_yearly",
        },
        {
          name: "Year",
          value: "year",
        },
        {
          name: "All Time",
          value: "all_time",
        },
      ],
    },
    {
      name: "dimension",
      description: "Dimension",
      type: ApplicationCommandOptionType.Integer,
      required: false,
      choices: [
        {
          name: "2x2",
          value: 2,
        },
        {
          name: "3x3",
          value: 3,
        },
        {
          name: "4x4",
          value: 4,
        },
        {
          name: "5x5",
          value: 5,
        },
      ],
    },
  ],
  contexts: [0, 1, 2],
  integrationTypes: [0, 1],

  callback: async (client, interaction) => {
    const { brainzUsername } = await getAuth(interaction);
    if (interaction.replied) {
      return;
    }

    const timePeriod = interaction.options.get("timeperiod")?.value || "week";
    const dimension = interaction.options.get("dimension")?.value || 3;

    // Create base embed
    const embed = new EmbedBuilder({
      color: 0x353070,
    });
    if (timePeriod === "all_time") {
      embed.setTitle(
        `${dimension}x${dimension} All Time chart for ${brainzUsername}`
      );
    } else if (timePeriod === "half_yearly") {
      embed.setTitle(
        `${dimension}x${dimension} Half Yearly chart for ${brainzUsername}`
      );
    } else {
      embed.setTitle(
        `${dimension}x${dimension} ${
          timePeriod[0].toUpperCase() + timePeriod.substring(1)
        }ly chart for ${brainzUsername}`
      );
    }

    // Send back image of chart
    const imageURL = `https://api.listenbrainz.org/1/art/grid-stats/${brainzUsername}/${timePeriod}/${dimension}/0/1024`;

    const png = await convertSvgToPng(imageURL);

    const attachment = new AttachmentBuilder(await png, {
      name: "chart.png",
    });

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  },
};
