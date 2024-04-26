const { Model } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  class ChatList extends Model {}

  ChatList.init(
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sender_id: Sequelize.INTEGER(11),
      receiver_id: Sequelize.INTEGER(11),
      last_message: Sequelize.TEXT,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
      deleted_at: Sequelize.DATE,
    },
    {
      // options
      sequelize,
      paranoid: true,
      modelName: "ChatList",
      tableName: "chat_lists",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscore: true,
    }
  );

  return ChatList;
};
