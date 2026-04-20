import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { isString } from 'class-validator';

/**
 * Custom pipe to transform JSON string fields from multipart form data into objects.
 * This is needed because multipart form data doesn't automatically parse nested JSON objects.
 */
@Injectable()
export class ParseJsonFieldsPipe implements PipeTransform {
  private readonly jsonFields: string[];

  constructor(...jsonFields: string[]) {
    this.jsonFields = jsonFields;
  }

  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value || metadata.type !== 'body') {
      return value;
    }

    for (const field of this.jsonFields) {
      if (value[field] && isString(value[field])) {
        try {
          value[field] = JSON.parse(value[field]);
        } catch (error) {
          throw new BadRequestException({
            message: `${field} must be a valid JSON object`,
            error: 'Bad Request',
            statusCode: 400,
          });
        }
      }
    }

    return value;
  }
}
