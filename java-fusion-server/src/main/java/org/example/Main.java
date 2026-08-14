package org.example;

import io.fusionauth.http.server.HTTPListenerConfiguration;
import io.fusionauth.http.server.HTTPServer;
import io.fusionauth.http.server.HTTPHandler;

//TIP To <b>Run</b> code, press <shortcut actionId="Run"/> or
// click the <icon src="AllIcons.Actions.Execute"/> icon in the gutter.
public class Main {
    static void main() {
        HTTPHandler handler = (req, res) -> {
            String path = req.getPath();

            if (path.startsWith("/pokemon/")) {
                String id = path.substring("/pokemon/".length());

                res.setStatus(200);
                res.setHeader("Content-Type", "text/plain");
                res.getWriter().write("hello i am pokemon: " + id);
                return;
            }

            res.setStatus(404);
            res.getWriter().write("Not found");
        };

        HTTPServer server = new HTTPServer().withHandler(handler).withListener(new HTTPListenerConfiguration(3000));

        server.start();
    }
}
