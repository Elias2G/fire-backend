var express = require('express');
var mysql = require('mysql');
var app = express();

var pool = mysql.createPool({
  connectionLimit: 100,
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'ff-kappel',
  debug: false
});

const get = "/api/get/";

var termine = "SELECT * from termine_online";
var news = "SELECT * from news_online";

var einsätze = "SELECT anwesenheit.Bilderverzeichnis, anwesenheit.Datum, anwesenheit.Brandeinsatz, anwesenheit.Techn_Einsatz, anwesenheit.Techn_Hilfeleistung, anwesenheit.Beginn, anwesenheit.Dauer, anwesenheit.Ausrueckungsgrund, anwesenheit.Einsatzort, anwesenheit.`TLFA2000`, anwesenheit.`SLF`, anwesenheit.`MTF`, Sum(`Anwesend`+`Bereitschaft`)*(1) AS Anzahl FROM anwesenheit INNER JOIN `name für anwesenheit` ON anwesenheit.`Lfd_Nr` = `name für anwesenheit`.`Einsatz-Nr` GROUP BY anwesenheit.Datum, anwesenheit.Brandeinsatz, anwesenheit.Techn_Einsatz, anwesenheit.Techn_Hilfeleistung, anwesenheit.Beginn, anwesenheit.Dauer, anwesenheit.Ausrueckungsgrund, anwesenheit.Einsatzort, anwesenheit.TLFA2000, anwesenheit.SLF, anwesenheit.MTF, anwesenheit.Lfd_Nr HAVING (anwesenheit.Brandeinsatz = true) OR ( anwesenheit.Techn_Einsatz = True) OR (anwesenheit.Techn_Hilfeleistung = True)";

var mannschaft = "SELECT aktueller_Dienstgrad.Kürzel, mannschaft.Zuname, mannschaft.Vorname, mannschaft.Status, eintritt.Datum, funktionskürzel.Bezeichnung, funktion.Datum_anfang, DATEDIFF(funktion.Datum_anfang, NOW()) AS Dauer, mannschaft.Bilderverzeichnis FROM funktionskürzel INNER JOIN (funktion INNER JOIN (eintritt INNER JOIN (mannschaft INNER JOIN (SELECT mannschaft.`Paß-Nr`, concat(Vorname, ' ', Zuname) AS Name, dienstkürzel.Kürzel, dienstkürzel.Dienstgradbez, dienstgrad.Datum FROM (mannschaft INNER JOIN (dienstkürzel INNER JOIN dienstgrad ON (dienstkürzel.Kürzel = dienstgrad.Kürzel) AND (dienstkürzel.Kürzel = dienstgrad.Kürzel)) ON mannschaft.`Paß-Nr` = dienstgrad.`Paß-Nr`) INNER JOIN (SELECT dienstgrad.`Paß-Nr`, Max(dienstgrad.Datum) AS `Max von Datum` FROM mannschaft LEFT JOIN dienstgrad ON mannschaft.`Paß-Nr` = dienstgrad.`Paß-Nr` GROUP BY dienstgrad.`Paß-Nr`) akt_dienstgrad_ermitteln ON mannschaft.`Paß-Nr` = `akt_dienstgrad_ermitteln`.`Paß-Nr` GROUP BY mannschaft.`Paß-Nr`, Name, dienstkürzel.Kürzel, dienstkürzel.Dienstgradbez, dienstgrad.Datum, mannschaft.Status, `akt_dienstgrad_ermitteln`.`Max von Datum` HAVING (((dienstgrad.Datum) = `Max von Datum`))) aktueller_Dienstgrad ON mannschaft.`Paß-Nr` = aktueller_Dienstgrad.`Paß-Nr`) ON eintritt.`Paß-Nr` = mannschaft.`Paß-Nr`) ON funktion.`Paß-Nr` = mannschaft.`Paß-Nr`) ON funktionskürzel.Kürzel = funktion.Kürzel GROUP BY aktueller_Dienstgrad.Kürzel, mannschaft.Zuname, mannschaft.Vorname, mannschaft.status, eintritt.Datum, funktionskürzel.Bezeichnung, funktion.Datum_anfang, DateDiff(funktion.Datum_anfang, NOW()), mannschaft.Bilderverzeichnis, eintritt.Art, funktion.Kürzel HAVING (((eintritt.Art) = 'ersteintritt FW') AND ((Count(funktion.Datum_ende))=0)) ORDER BY mannschaft.Status";

var aktueller_Dienstgrad = "SELECT mannschaft.`Paß-Nr`, concat(Vorname, ' ', Zuname) AS Name, dienstkürzel.Kürzel, dienstkürzel.Dienstgradbez, dienstgrad.Datum FROM (mannschaft INNER JOIN (dienstkürzel INNER JOIN dienstgrad ON (dienstkürzel.Kürzel = dienstgrad.Kürzel) AND (dienstkürzel.Kürzel = dienstgrad.Kürzel)) ON mannschaft.`Paß-Nr` = dienstgrad.`Paß-Nr`) INNER JOIN (SELECT dienstgrad.`Paß-Nr`, Max(dienstgrad.Datum) AS `Max von Datum` FROM mannschaft LEFT JOIN dienstgrad ON mannschaft.`Paß-Nr` = dienstgrad.`Paß-Nr` GROUP BY dienstgrad.`Paß-Nr`) akt_dienstgrad_ermitteln ON mannschaft.`Paß-Nr` = `akt_dienstgrad_ermitteln`.`Paß-Nr` GROUP BY mannschaft.`Paß-Nr`, Name, dienstkürzel.Kürzel, dienstkürzel.Dienstgradbez, dienstgrad.Datum, mannschaft.Status, `akt_dienstgrad_ermitteln`.`Max von Datum` HAVING (((dienstgrad.Datum) = `Max von Datum`))";

var akt_dienstgrad_ermitteln = "SELECT dienstgrad.`Paß-Nr`, Max(dienstgrad.Datum) AS `Max von Datum` FROM mannschaft LEFT JOIN dienstgrad ON mannschaft.`Paß-Nr` = dienstgrad.`Paß-Nr` GROUP BY dienstgrad.`Paß-Nr`";


const handle_database =  query => (req, res) => {
  pool.getConnection(function(err, connection) {
    if(err) {
      res.json({"code" : 100, "status" : "Error in connection database"});
      return;
    }
    console.log("connected as id " + connection.threadId);

    connection.query(query, function(err, rows) {
      connection.release();
      if(!err) {
        res.json(rows);
      }
    });

    connection.on('error', function(err) {
      res.json({"code" : 100, "status" : "Error in connection database"});
      return;
    });
  });
}

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const getApiCall = (api, query) => {
  app.get(api, handle_database(query));
}

getApiCall(get + "einsaetze", einsätze);
getApiCall(get + "mannschaft", mannschaft);
getApiCall(get + "termine", termine);
getApiCall(get + "news", news);
getApiCall(get + "test", aktueller_Dienstgrad);

getApiCall(get + "akt_dienstgrad_ermitteln", akt_dienstgrad_ermitteln);


app.listen(8080);
