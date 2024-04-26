const { Model } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  class User extends Model {}

  User.init(
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fullname: Sequelize.STRING(100),
      level: Sequelize.STRING(50),
      // phone_number: Sequelize.STßRING(50),
      // email: Sequelize.STRING(100),
      // password: Sequelize.TEXT,
      // is_active: Sequelize.BOOLEAN,
      // verif_code: Sequelize.STRING(100),
      profile_image: Sequelize.TEXT,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
    },
    {
      // options
      sequelize,
      modelName: "User",
      tableName: "users",
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscore: true,
    }
  );
  return User;
};
