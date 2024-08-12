const express = require("express");
const cors = require("cors");
const chatRoutes = require("./app/routes/chat.routes");

const db = require("./app/models/index");
const Sequelize = require("sequelize");
const moment = require("moment");

const Op = Sequelize.Op;
const ChatList = db.chat_list;
const User = db.user;
const Shop = db.shop;
const Chats = db.chats;
const Notification = db.notification;

const app = express();
const port = 4040;

const { createServer } = require("node:http");
const { Server } = require("socket.io");

const server = createServer(app);
const io = new Server(server, { cors: { origin: `http://localhost:${port}` } });
const OneSignal = require("@onesignal/node-onesignal");
const { update } = require("./app/controllers/chat_list.controller");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

db.sequelize.sync();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// app.use("/api/chat", chatRoutes);

//list
app.get("/api/chat", async (req, res) => {
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
});

//find
app.get("/api/chat/detail", async (req, res) => {
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
});

//create
app.post("/api/chat", async (req, res) => {
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
      .then(async (d) => {
        const chatId = d.chat_id;

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
          where: { id: d.id },
          include: ["pet"],
        });

        const data = {
          receiver: receiver_id,
          list,
          list_self,
          detail,
          chat_id: chatId,
        };

        //kirim notifikasi onesignal ke receiver
        // const notification = new OneSignal.Notification();
        // notification.app_id = '0223dd42-0ff3-475a-bfbe-b8a0f19207d1'
        // notification.

        //save data notifikasi ke db
        const sender = await User.findByPk(sender_id);
        const receiver = await User.findByPk(receiver_id);

        const notificationPayload = {
          title: "💬 Ada Pesan Baru Nih!",
          content: sender.fullname + " Mengirim Pesan Baru",
          redirect_url: "chats/detail/" + chatId,
          user_id: receiver_id,
          opened: 0,
          reference_id: chatId,
          reference_from: "chats",
          created_at: moment().format("YYYY-MM-DD hh:mm:ss"),
          updated_at: moment().format("YYYY-MM-DD hh:mm:ss"),
        };

        await Notification.create(notificationPayload)
          .then(async (o) => {
            if (Object.keys(o).length) {
              //trigger socket update badge notifikasi
              const receiverEvent =
                receiver.level == "admin" ? "admin" : receiver.id;
              const eventName = "notificationsUser-" + receiverEvent;
              const data = await Notification.count({
                where: [
                  {
                    user_id: receiver_id,
                    opened: 0,
                  },
                ],
                attributes: [[Sequelize.fn("COUNT", 0), "count"]],
              });

              io.emit(eventName, { data, additional: null });
            }
          })
          .catch((err) => {
            output.statusCode = 500;
            output.message =
              err.message ||
              "Some error occurred while creating the Notification";
            res.status(output.statusCode).json(output);
          });

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
        io.emit("badgeChat-User" + receiver_id, unseenChatTab);

        //update messages receiver
        io.emit("messagesChat-User" + receiver_id, data);

        //update messages sender
        io.emit("updateChatSelf-User" + sender_id, {
          list: list_self,
        });

        output.success = true;
        output.statusCode = 200;
        output.message = "Chat Berhasil dikirim!";
        res.status(output.statusCode).json(output);
      })
      .catch((err) => {
        output.statusCode = 500;
        output.message =
          err.message || "Some error occurred while creating the Chat";
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
});

//update
app.put("/api/chat", (req, res) => {
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
});

//seen
app.put("/api/chat/seen", (req, res) => {
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
      io.emit("updateSeen-User" + payload.receiver_id, { seen: true });

      //trigger event untuk update badge unseen & list
      io.emit("updateUnseen-User" + payload.sender_id, { list });

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
});

//notification
app.post("/api/notification", (req, res) => {
  const body = req.body;

  const data = body.data;
  const eventName = body.eventName;
  const additional = body.additional;

  io.emit(eventName, { data, additional });
  res.send("Emit Notification Success!");
});

io.on("connection", (socket) => {
  console.warn("a user connected");

  socket.on("message", (data) => {
    socket.broadcast.emit("receiver-" + data.receiver, data);
  });

  // //ketika A buka chat B
  // socket.on("set-seen", (data) => {
  //   //trigger seen checked ke B
  //   socket.broadcast.emit("receive-seen-" + data.receiver, data);
  // });

  // socket.on("set-update-unseen", (data) => {
  //   socket.emit("receive-unseen-" + data.receiver, data);
  // });

  // socket.on("set-update-self", (data) => {
  //   console.log(data);
  //   socket.emit("receive-update-self-" + data.receiver, data);
  // });

  socket.on("set-update-badge", (data) => {
    console.log(data);
    socket.emit("receive-update-self-" + data.receiver, data);
  });
});

server.listen(port, () => {
  console.log(`server running at http://localhost:${port}`);
});

module.exports = io;
