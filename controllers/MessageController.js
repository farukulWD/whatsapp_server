import getPrismaInstance from "../utils/PrismaClient.js";
import { renameSync } from "fs";

export const addMessage = async (req, res, next) => {
  try {
    const { to, from, message } = req.body;
    const getUser = onlineUsers.get(to);
    if (message && from && to) {
      const Prisma = getPrismaInstance();
      const newMessage = await Prisma.messages.create({
        data: {
          message,
          sender: { connect: { id: parseInt(from) } },
          receiver: { connect: { id: parseInt(to) } },
          messageStatus: getUser ? "delivered" : "send",
        },
        include: { sender: true, receiver: true },
      });
      return res.status(201).send({ message: newMessage });
    }
    return res.status(400).send("From,to and Message are required");
  } catch (error) {
    console.log(error);
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  const { from, to } = req.params;

  try {
    const Prisma = getPrismaInstance();
    const messages = await Prisma.messages.findMany({
      where: {
        OR: [
          {
            senderId: parseInt(from),
            receiverId: parseInt(to),
          },
          {
            senderId: parseInt(to),
            receiverId: parseInt(from),
          },
        ],
      },
      orderBy: {
        id: "asc",
      },
      include: { sender: true, receiver: true },
    });

    const unreadMessages = [];

    messages.forEach((message) => {
      if (
        message.messageStatus !== "read" &&
        message.senderId === parseInt(to)
      ) {
        message.messageStatus = "read";
        unreadMessages.push(message.id);
      }
    });

    if (unreadMessages.length > 0) {
      await Prisma.messages.updateMany({
        where: {
          id: { in: unreadMessages },
        },
        data: {
          messageStatus: "read",
        },
      });
    }
    res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
};

export const addImageMessage = async (req, res, next) => {
  try {
    if (req?.file) {
      const date = Date.now();
      const filename = "uploads/images/" + date + req?.file?.originalname;
      renameSync(req?.file?.path, filename);
      const { from, to } = req.query;
      const Prisma = getPrismaInstance();
      if (from && to) {
        const message = await Prisma.messages.create({
          data: {
            message: filename,
            sender: { connect: { id: parseInt(from) } },
            receiver: { connect: { id: parseInt(to) } },
            type: "image",
          },
          include: { sender: true, receiver: true },
        });
        return res.status(201).json({ message });
      }
      return res.status(400).send("From, To are required");
    }
    return res.status(400).send("Image is Required");
  } catch (error) {
    next(error);
  }
};
export const addAudioMessage = async (req, res, next) => {
  try {
    if (req?.file) {
      const date = Date.now();
      const filename = "uploads/recorded/" + date + req?.file?.originalname;
      renameSync(req?.file?.path, filename);
      const { from, to } = req.query;
      const Prisma = getPrismaInstance();
      if (from && to) {
        const message = await Prisma.messages.create({
          data: {
            message: filename,
            sender: { connect: { id: parseInt(from) } },
            receiver: { connect: { id: parseInt(to) } },
            type: "audio",
          },
          include: { sender: true, receiver: true },
        });
        return res.status(201).json({ message });
      }
      return res.status(400).send("From, To are required");
    }
    return res.status(400).send("audio is Required");
  } catch (error) {
    next(error);
  }
};

export const getInitialContactsWithMessages = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.from);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const Prisma = getPrismaInstance();

    const user = await Prisma.user.findUnique({
      where: { id: userId },
      include: {
        sendMessages: {
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        receivedMessages: {
          include: {
            sender: true,
            receiver: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const messages = [...user.sendMessages, ...user.receivedMessages];
    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const users = new Map();
    const messageStatusChange = [];

    messages.forEach((msg) => {
      const isSender = msg.senderId === userId;
      const calculateId = isSender ? msg.receiverId : msg.senderId;

      if (msg.messageStatus === "sent") {
        messageStatusChange.push(msg.id);
      }

      const {
        id,
        type,
        messageStatus,
        senderId,
        receiverId,
        message,
        createdAt,
      } = msg;

      if (!users.has(calculateId)) {
        let userInfo = {
          messageId: id,
          type,
          messageStatus,
          senderId,
          receiverId,
          message,
          createdAt,
        };

        if (isSender) {
          userInfo = {
            ...userInfo,
            ...msg.receiver,
            totalUnreadMessages: 0,
          };
        } else {
          userInfo = {
            ...userInfo,
            ...msg.sender,
            totalUnreadMessages: messageStatus !== "read" ? 1 : 0,
          };
        }

        users.set(calculateId, userInfo);
      } else if (messageStatus !== "read" && !isSender) {
        const existingUser = users.get(calculateId);
        users.set(calculateId, {
          ...existingUser,
          totalUnreadMessages: existingUser.totalUnreadMessages + 1,
        });
      }
    });

    if (messageStatusChange.length) {
      await Prisma.messages.updateMany({
        where: {
          id: { in: messageStatusChange },
        },
        data: { messageStatus: "delivered" },
      });
    }

    res.status(200).json({
      users: Array.from(users.values()),
      onlineUsers: Array.from(onlineUsers.keys()),
    });
  } catch (err) {
    next(err);
  }
};
