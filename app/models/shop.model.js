const { Model } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  class Shop extends Model {}

  Shop.init(
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: Sequelize.STRING(100),
      description: Sequelize.TEXT,
      address: Sequelize.STRING(255),
      user_id: Sequelize.INTEGER(11),
      is_verified: Sequelize.INTEGER(11),
      city_id: Sequelize.INTEGER(11),
      city: Sequelize.STRING(100),
      province_id: Sequelize.INTEGER(11),
      province: Sequelize.STRING(100),
      galleries: Sequelize.TEXT,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
      deleted_at: Sequelize.DATE,
    },
    {
      // options
      sequelize,
      paranoid: true,
      modelName: "Shop",
      tableName: "shops",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscore: true,
    }
  );
  return Shop;
};
