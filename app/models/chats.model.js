const { Model } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  class Chats extends Model {}

  Chats.init(
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      chat_id: Sequelize.INTEGER(11),
      user_id: Sequelize.INTEGER(11),
      message: Sequelize.TEXT,
      pet_id: Sequelize.INTEGER(11),
      seen: Sequelize.BOOLEAN,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
      deleted_at: Sequelize.DATE,
    },
    {
      // options
      sequelize,
      paranoid: true,
      modelName: "Chats",
      tableName: "chats",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscore: true,
    }
  );

  return Chats;
};
