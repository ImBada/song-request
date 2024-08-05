const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const Song = sequelize.define('Song', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  song: {
    type: DataTypes.STRING,
    allowNull: false
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = { Song, sequelize };
