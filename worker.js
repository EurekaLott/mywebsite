export default {
  async fetch(request) {

    const url = new URL(request.url);

    if (url.pathname === "/api/predict") {

      return Response.json({

        status: "ok",

        message: "Bruce Lee is Ready!",

        prediction: {

          left: [19,12],

          right: [45,2]

        }

      });

    }

    return new Response(
      "EurekaLott Engine Running"
    );

  }
};
