const dbConfig = require("../config/db.config");
const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorAlias: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// define semua models yang ada pada aplikasi
db.chat_list = require("./chat_list.model")(sequelize, Sequelize);
db.user = require("./user.model")(sequelize, Sequelize);
db.shop = require("./shop.model")(sequelize, Sequelize);
db.chats = require("./chats.model")(sequelize, Sequelize);
db.pet = require("./pet.model")(sequelize, Sequelize);

db.chat_list.belongsTo(db.user, {
  targetKey: "id",
  foreignKey: "sender_id",
  as: "user",
});
db.chat_list.belongsTo(db.user, {
  targetKey: "id",
  foreignKey: "receiver_id",
  as: "shop",
});

db.user.hasOne(db.shop, {
  targetKey: "id",
  foreignKey: "user_id",
  as: "shop",
});

db.chat_list.hasMany(db.chats, {
  as: "unseen",
  foreignKey: "chat_id",
});

db.chats.belongsTo(db.pet, {
  targetKey: "id",
  foreignKey: "pet_id",
  as: "pet",
});

module.exports = db;
