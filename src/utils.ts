import { xml2js } from 'xml-js';


export const xmlToObject = <T>(xml: string): T => xml2js(xml, {
    compact: true,
    ignoreDeclaration: true,
    ignoreComment: true,
    nativeType: true,
}) as T;
