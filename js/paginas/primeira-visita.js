// Script da página primeira-visita.html (separado do HTML para permitir CSP sem 'unsafe-inline').
import { montarFormulario } from "../core/forms.js";
import { preencherDadosIgreja } from "./comum.js";
if (document.getElementById("form-visita")) {
montarFormulario(document.getElementById("form-visita"), "visita");
preencherDadosIgreja();
}
