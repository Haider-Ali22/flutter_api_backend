const Messages = require("../models/messageModel");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    })
      .sort({ createdAt: 1 })
      .lean();

    const projectedMessages = messages.map((msg) => {
      return {
        _id: msg._id,
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
        status: msg.status,
        createdAt: msg.createdAt,
        seenAt: msg.seenAt || null,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
      status: "sent",
    });

    if (data) return res.json({ msg: "Message added successfully.", messageId: data._id });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

/**
 * Update status for a message: body { messageId, status } status = "delivered" | "seen"
 */
module.exports.updateStatus = async (req, res, next) => {
  try {
    const { messageId, status } = req.body;
    if (!["delivered", "seen"].includes(status))
      return res.status(400).json({ msg: "Invalid status" });

    const update = { status };
    if (status === "seen") update.seenAt = new Date();

    const msg = await Messages.findByIdAndUpdate(messageId, update, { new: true });

    if (!msg) return res.status(404).json({ msg: "Message not found" });

    return res.json({ msg: "Status updated", message: msg });
  } catch (ex) {
    next(ex);
  }
};
