const { Model } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  class Pet extends Model {}

  Pet.init(
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: Sequelize.STRING(200),
      price: Sequelize.STRING(100),
      discount_type: Sequelize.STRING(100),
      discount_percent: Sequelize.INTEGER(11),
      discount_amount: Sequelize.INTEGER(11),
      images: Sequelize.TEXT,
      created_at: Sequelize.DATE,
      updated_at: Sequelize.DATE,
      deleted_at: Sequelize.DATE,
    },
    {
      // options
      sequelize,
      paranoid: true,
      modelName: "Pet",
      tableName: "pets",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      underscore: true,
    }
  );
  return Pet;
};
