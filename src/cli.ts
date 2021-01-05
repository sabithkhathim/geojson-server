import * as commandLineArgs from 'command-line-args';
import { OptionDefinition } from 'command-line-args';
import { createService } from './server';

/**
 * Adds missing properties from typings.
 */
export interface FixedOptionDefinition extends OptionDefinition {
  description: string;
  typeLabel: string;
}

export interface ICommandOptions {
  port: number;
  static: string;
  maxZoom: number;
  promoteId: string;
  generatedId: boolean;
  help: boolean;
  buffer: number;
}

export class CommandLineInterface {
  static optionDefinitions: FixedOptionDefinition[] = [
    {
      name: 'help',
      alias: 'h',
      type: Boolean,
      typeLabel: '[underline]{Boolean}',
      description: 'Show help text'
    },
    {
      name: 'port',
      alias: 'p',
      type: Number,
      defaultValue: 8080,
      typeLabel: '[underline]{Number}',
      description: 'Port address'
    },
    {
      name: 'maxZoom',
      alias: 'z',
      type: Number,
      defaultValue: 22,
      typeLabel: '[underline]{Number}',
      description: 'Max zoom'
    },
    {
      name: 'promoteId',
      alias: 'i',
      type: String,
      typeLabel: '[underline]{String}',
      description: 'Name of the property to use as ID.'
    },
    {
      name: 'generateId',
      alias: 'g',
      type: Boolean,
      defaultValue: true,
      typeLabel: '[underline]{String}',
      description: 'Generate an ID for each feature automatically.'
    },
    {
      name: 'static',
      alias: 's',
      type: String,
      defaultValue: './public',
      typeLabel: '[underline]{String}',
      description: 'Static (public) folder'
    },
    {
      name: 'buffer',
      alias: 'b',
      type: Number,
      defaultValue: 64,
      typeLabel: '[underline]{Number}',
      description: 'Buffer value'
    }
  ];
}

const options = commandLineArgs(CommandLineInterface.optionDefinitions) as ICommandOptions;
createService(options);

