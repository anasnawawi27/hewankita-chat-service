const { Model } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  class Notification extends Model {}

  Notification.init(
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: Sequelize.STRING(255),
      content: Sequelize.TEXT,
      image: Sequelize.TEXT,
      redirect_url: Sequelize.STRING(255),
      user_id: Sequelize.INTEGER,
      opened: Sequelize.TINYINT,
      reference_id: Sequelize.INTEGER,
      reference_from: Sequelize.STRING(200),
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
    },
    {
      // options
      sequelize,
      modelName: "Notification",
      tableName: "notifications",
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscore: true,
    }
  );
  return Notification;
};
