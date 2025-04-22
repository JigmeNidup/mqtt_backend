let { createTransport } = require("nodemailer");

let enable_mail = true;

let transporter = createTransport({
  service: "gmail",
  auth: {
    user: process.env.GDL_EMAIL,
    pass: process.env.GDL_APP_PASSWORD,
  },
});

let sendMail = ({ to, subject, text, html }) => {
  let mailOptions = {
    from: process.env.GDL_EMAIL,
    to: to,
    subject: subject,
    text: text,
    html: html || "",
  };

  if (enable_mail) {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  } else {
    console.log(to, subject);
  }
};

module.exports = sendMail;
