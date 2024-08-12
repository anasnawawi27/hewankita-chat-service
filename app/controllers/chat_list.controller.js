const db = require("../models");
const express = require("express");
const Sequelize = require("sequelize");

const Op = Sequelize.Op;
const ChatList = db.chat_list;
const User = db.user;
const Shop = db.shop;
const Chats = db.chats;

const io = require("./../../server");

//CREATE
exports.create = async (req, res) => {
  const payload = req.body;
  const sender_id = payload.sender_id;
  const receiver_id = payload.receiver_id;
  const pet_id = payload.pet_id;
  const message = payload.message;

  const output = {
    success: false,
    statusCode: 400,
  };

  const errors = [];

  if (!message) {
    errors.push("Pesan wajib diisi");
  }

  if (!sender_id) {
    errors.push("Sender ID wajib diisi");
  }

  if (!receiver_id) {
    errors.push("Receiver ID wajib diisi");
  }

  if (errors.length) {
    output.errors = errors;
    return res.status(output.statusCode).send(output);
  }

  const exist = await ChatList.findOne({
    where: [
      {
        sender_id: {
          [Op.or]: [sender_id, receiver_id],
        },
        receiver_id: {
          [Op.or]: [sender_id, receiver_id],
        },
      },
    ],
  });

  const saveChat = (payloadData) => {
    Chats.create(payloadData)
      .then(async (data) => {
        const chatId = data.chat_id;

        const list = await ChatList.findOne({
          attributes: {
            include: [
              [
                // Note the wrapping parentheses in the call below!
                Sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM chats
                  WHERE chats.user_id != ${receiver_id}
                  AND chats.seen = 0 
                  AND chats.chat_id = ChatList.id
               )`),
                "unseen",
              ],
            ],
          },
          where: { id: chatId },
          include: [
            { model: User, as: "user" },
            { model: User, as: "shop", include: [{ model: Shop, as: "shop" }] },
            // { model: Chats, as: "unseen", where: { seen: false, user_id: 24 } },
          ],
        });
        const list_self = await ChatList.findOne({
          attributes: {
            include: [
              [
                // Note the wrapping parentheses in the call below!
                Sequelize.literal(`(
                  SELECT COUNT(*)
                  FROM chats
                  WHERE chats.user_id != ${sender_id}
                  AND chats.seen = 0 
                  AND chats.chat_id = ChatList.id
               )`),
                "unseen",
              ],
            ],
          },
          where: { id: chatId },
          include: [
            { model: User, as: "user" },
            { model: User, as: "shop", include: [{ model: Shop, as: "shop" }] },
            // { model: Chats, as: "unseen", where: { seen: false, user_id: 24 } },
          ],
        });
        const detail = await Chats.findOne({
          where: { id: data.id },
          include: ["pet"],
        });

        const dataObj = {
          receiver: receiver_id,
          list,
          list_self,
          detail,
          chat_id: chatId,
        };

        //kirim notifikasi onesignal ke receiver

        //save data notifikasi ke db

        //trigger socket update badge notifikasi, event notificationsUser-(admin / user_id)

        //update tab chat badge si receiver
        const unseenChatTab = await Chats.count({
          where: [
            {
              user_id: { [Op.not]: receiver_id },
              seen: 0,
              chat_id: chatId,
            },
          ],
          attributes: [[Sequelize.fn("COUNT", 0), "count"]],
        });
        console.warn(io);
        console.warn("badgeChat-User" + receiver_id, unseenChatTab);
        io.emit("badgeChat-User" + receiver_id, unseenChatTab);

        //update messages receiver
        io.emit("receiver-" + dataObj.receiver, dataObj);

        //update messages sender
        io.emit("receive-update-self-" + sender_id, {
          list: list_self,
          receiver: sender_id,
        });

        output.data = dataObj;
        output.success = true;
        output.statusCode = 200;
        output.message = "Chat Berhasil dikirim!";
        res.status(output.statusCode).json(output);
      })
      .catch((err) => {
        output.statusCode = 500;
        (output.message =
          err.message || "Some error occurred while creating the Chat"),
          res.status(output.statusCode).json(output);
      });
  };

  if (!exist) {
    const chatList = {
      sender_id: sender_id,
      receiver_id: receiver_id,
      last_message: message,
    };

    ChatList.create(chatList)
      .then((data) => {
        if (Object.keys(data).length) {
          const payloadData = {
            chat_id: data.id,
            user_id: sender_id,
            pet_id: pet_id || null,
            message: message,
          };

          saveChat(payloadData);
        }
      })
      .catch((err) => {
        output.statusCode = 500;
        (output.message =
          err.message || "Some error occurred while creating the Chat"),
          res.status(output.statusCode).json(output);
      });
  } else {
    const chatList = {
      last_message: message,
    };
    ChatList.update(chatList, {
      where: [{ id: exist.id }],
    })
      .then((num) => {
        if (num == 1) {
          const payloadData = {
            chat_id: exist.id,
            user_id: sender_id,
            pet_id: pet_id || null,
            message: message,
          };

          saveChat(payloadData);
        } else {
          output.message = "Update Chat Gagal";
        }
      })
      .catch((err) => {
        output.statusCode = 500;
        (output.message =
          err.message || "Some error occurred while creating the Chat"),
          res.status(output.statusCode).json(output);
      });
  }
};

// GET ALL
exports.findAll = async (req, res) => {
  setInterval(() => {
    io.emit("TEST-SOCKET", "DATA FROM SOCKET");
  }, 3000);

  const output = {
    success: false,
    statusCode: 400,
  };

  const userId = parseInt(req.query.user_id);
  const user = await User.findByPk(userId);

  if (!user) {
    output.message = "User tidak ditemukan !";
    res.status(output.statusCode).json(output);
  }

  ChatList.findAll({
    attributes: {
      include: [
        [
          // Note the wrapping parentheses in the call below!
          Sequelize.literal(`(
            SELECT COUNT(id)
            FROM chats
            WHERE 
            chats.user_id != ${userId}
            AND chats.seen = 0 
            AND chats.chat_id = ChatList.id
         )`),
          "unseen",
        ],
      ],
    },
    where: {
      [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
    },
    include: [
      { model: User, as: "user" },
      { model: User, as: "shop", include: [{ model: Shop, as: "shop" }] },
      // { model: Chats, as: "unseen", where: { seen: false, user_id: 24 } },
    ],
  })
    .then((chatList) => {
      output.statusCode = 200;
      output.success = true;
      output.data = chatList;
      res.status(output.statusCode).json(output);
    })
    .catch((err) => {
      res.status(500).json({
        message: err.message || "Some error occurred while retrieving books.",
        data: null,
      });
    });
};

// UPDATE
exports.update = (req, res) => {
  const payload = req.body;
  const output = {
    success: false,
    statusCode: 400,
  };

  const errors = [];

  if (!payload.message) {
    errors.push("Pesan wajib diisi");
  }

  if (!payload.sender_id) {
    errors.push("Sender ID wajib diisi");
  }

  if (!payload.receiver_id) {
    errors.push("Receiver ID wajib diisi");
  }

  if (errors.length) {
    output.errors = errors;
    return res.status(output.statusCode).send(output);
  }

  const chatList = {
    last_message: payload.message,
  };

  ChatList.update(chatList, {
    where: [{ sender_id: payload.sender_id, receiver_id: payload.receiver_id }],
  })
    .then((num) => {
      if (num == 1) {
        output.success = true;
        output.statusCode = 200;
        output.message = "Chat Berhasil diupdate";
        res.status(output.statusCode).json(output);
      } else {
        output.message = "Update Chat Gagal";
      }
      res.status(output.statusCode).json(output);
    })
    .catch((err) => {
      output.statusCode = 500;
      (output.message =
        err.message || "Some error occurred while creating the Chat"),
        res.status(output.statusCode).json(output);
    });
};

//FIND
exports.find = async (req, res) => {
  const query = req.query;
  const output = {
    success: false,
    statusCode: 400,
  };

  const errors = [];

  if (!query.chat_id) {
    if (!query.sender_id) {
      errors.push("Sender ID wajib diisi");
    }

    if (!query.receiver_id) {
      errors.push("Receiver ID wajib diisi");
    }
  }

  if (errors.length) {
    output.errors = errors;
    return res.status(output.statusCode).send(output);
  }

  const chatId = query.chat_id;
  const userId = query.sender_id;
  const user = await User.findByPk(userId);

  if (!user) {
    output.message = "User tidak ditemukan!";
    return res.status(output.statusCode).send(output);
  }

  let data = {};
  let chatHeading = null;
  if (!chatId) {
    chatHeading = await ChatList.findOne({
      where: [
        {
          sender_id: {
            [Op.or]: [query.sender_id, query.receiver_id],
          },
          receiver_id: {
            [Op.or]: [query.sender_id, query.receiver_id],
          },
        },
      ],
      include: [
        { model: User, as: "user" },
        { model: User, as: "shop", include: [{ model: Shop, as: "shop" }] },
      ],
    });
  } else {
    chatHeading = await ChatList.findOne({
      where: [{ id: chatId }],
      include: [
        { model: User, as: "user" },
        { model: User, as: "shop", include: [{ model: Shop, as: "shop" }] },
      ],
    });
  }

  data.heading = chatHeading;

  if (chatHeading == null) {
    data.messages = [];
  } else {
    if (!chatId) {
      data.messages = await Chats.findAll({
        where: { chat_id: chatHeading.id },
        include: ["pet"],
      });
    } else {
      data.messages = await Chats.findAll({
        where: { chat_id: chatId },
        include: ["pet"],
      });
    }
  }

  output.data = data;
  output.success = true;
  output.statusCode = 200;
  res.status(output.statusCode).json(output);
};

exports.seen = async (req, res) => {
  const payload = req.body;
  const output = {
    success: false,
    statusCode: 400,
  };

  const errors = [];

  if (!payload.chat_id) {
    errors.push("Chat ID wajib diisi");
  }

  if (!payload.receiver_id) {
    errors.push("Receiver ID wajib diisi");
  }

  if (!payload.sender_id) {
    errors.push("Sender ID wajib diisi");
  }

  if (errors.length) {
    output.errors = errors;
    return res.status(output.statusCode).send(output);
  }

  Chats.update(
    {
      seen: 1,
    },
    {
      where: { chat_id: payload.chat_id },
    }
  )
    .then(async (data) => {
      const list = await ChatList.findOne({
        attributes: {
          include: [
            [
              // Note the wrapping parentheses in the call below!
              Sequelize.literal(`(
                SELECT COUNT(*)
                FROM chats
                WHERE chats.user_id != ${payload.receiver_id}
                AND chats.seen = 0 
                AND chats.chat_id = ChatList.id
             )`),
              "unseen",
            ],
          ],
        },
        where: { id: payload.chat_id },
        include: [
          { model: User, as: "user" },
          { model: User, as: "shop", include: [{ model: Shop, as: "shop" }] },
          // { model: Chats, as: "unseen", where: { seen: false, user_id: 24 } },
        ],
      });

      //trigger event ke pengirim pesan (update checked seen)
      io.emit("receive-unseen-" + payload.sender_id, {
        chat: payload.chat_id,
        receiver: payload.receiver_id,
      });

      //trigger event update chat list pembuka pesan
      io.emit("receive-seen-" + payload.receiver_id, {
        list,
        receiver: payload.sender_id,
      });

      output.success = true;
      output.statusCode = 200;
      res.status(output.statusCode).json(output);
    })
    .catch((err) => {
      output.statusCode = 500;
      output.message =
        err.message || "Some error occurred while creating the Chat";
      res.status(output.statusCode).json(output);
    });
};

// // DELETE: Menghapus data sesuai id yang dikirimkan
// exports.delete = (req, res) => {
//   const id = req.params.id;
//   Book.destroy({
//     where: { id },
//   })
//     .then((num) => {
//       if (num == 1) {
//         res.json({
//           message: "Book deleted successfully.",
//           data: req.body,
//         });
//       } else {
//         res.json({
//           message: `Cannot delete book with id=${id}. Maybe book was not found!`,
//           data: req.body,
//         });
//       }
//     })
//     .catch((err) => {
//       res.status(500).json({
//         message: err.message || "Some error occurred while deleting the book.",
//         data: null,
//       });
//     });
// };
